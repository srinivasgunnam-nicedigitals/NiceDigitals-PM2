import { prisma } from '../config/db';
import { differenceInDays, parseISO } from 'date-fns';
import { AppError } from '../utils/AppError';

// Scoring rules - moved from frontend constants
const SCORING_RULES = {
    DELIVERY: 10,
    ON_TIME: 5,
    QA_FIRST_PASS: 2,
    EARLY_PER_DAY: 1,
    QA_REJECTION: -5,
    DEADLINE_MISSED: -10,
    DELAY_PER_DAY: -2,
};

export const VALID_TRANSITIONS: Record<string, string[]> = {
    'UPCOMING': ['DESIGN'],
    'DESIGN': ['DEVELOPMENT'],
    'DEVELOPMENT': ['QA'],
    'QA': ['ADMIN_REVIEW', 'DEVELOPMENT'], // QA can go to Admin Review (Pass) or Dev (Fail)
    'ADMIN_REVIEW': ['COMPLETED', 'SENT_TO_CLIENT'], // Allow flexibility if needed, but strict based on FE
    'SENT_TO_CLIENT': ['COMPLETED'],
    'COMPLETED': ['ADMIN_REVIEW'] // Allow Unarchive
};

interface AdvanceStageParams {
    projectId: string;
    nextStage: string;
    userId: string;
    tenantId: string;
    version: number; // Required for optimistic locking
}

interface QAFeedbackParams {
    projectId: string;
    passed: boolean;
    userId: string;
    tenantId: string;
    version: number; // Required for optimistic locking
}

/**
 * Advance a project to the next stage
 * This is the authoritative server-side implementation
 * Frontend should NEVER calculate scores or stage transitions
 */
export async function advanceProjectStage(params: AdvanceStageParams) {
    const { projectId, nextStage, userId, tenantId, version } = params;

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { id: true, stage: true, version: true, assignedDevManagerId: true, overallDeadline: true, qaFailCount: true, tenantId: true }
    });

    if (!project) {
        throw AppError.notFound('Project not found or access denied', 'PROJECT_NOT_FOUND');
    }

    // VERSION ENFORCEMENT: Check for conflicts
    if (project.version !== version) {
        throw AppError.conflict(
            'Project modified by another user',
            'VERSION_CONFLICT',
            { currentVersion: project.version, expectedVersion: version }
        );
    }

    // State Machine Validation
    const allowed = VALID_TRANSITIONS[project.stage] || [];
    if (!allowed.includes(nextStage)) {
        throw AppError.badRequest(`Invalid stage transition: Cannot move from ${project.stage} to ${nextStage}`, 'INVALID_TRANSITION');
    }

    // Create history entry
    const historyEntry = {
        stage: project.stage,
        timestamp: new Date().toISOString(),
        userId,
        action: `Transition to ${nextStage.replace(/_/g, ' ')}`
    };

    let completedAt: string | null = null;
    const scoresToCreate: any[] = [];

    // CRITICAL: Server-side scoring logic
    // Frontend CANNOT influence these calculations
    if (nextStage === 'COMPLETED' && project.assignedDevManagerId) {
        const today = new Date();
        const overallDeadline = new Date(project.overallDeadline);

        // Delivery points (always awarded on completion)
        scoresToCreate.push({
            projectId: project.id,
            userId: project.assignedDevManagerId,
            points: SCORING_RULES.DELIVERY,
            reason: 'Project Delivery',
            date: today.toISOString(),
            tenantId
        });

        // Schedule-based points (on-time bonus or late penalty)
        const daysDifference = differenceInDays(overallDeadline, today);

        if (daysDifference >= 0) {
            // On time or early
            scoresToCreate.push({
                projectId: project.id,
                userId: project.assignedDevManagerId,
                points: SCORING_RULES.ON_TIME,
                reason: 'On-Time Bonus',
                date: today.toISOString(),
                tenantId
            });
        } else {
            // Late
            scoresToCreate.push({
                projectId: project.id,
                userId: project.assignedDevManagerId,
                points: SCORING_RULES.DEADLINE_MISSED,
                reason: 'Deadline Missed Penalty',
                date: today.toISOString(),
                tenantId
            });
        }

        completedAt = today.toISOString();
    }

    // Transaction: Update project + create history + create scores atomically
    const result = await prisma.$transaction(async (tx) => {
        // Update project with version increment (atomic)
        await tx.$executeRaw`
            UPDATE "Project" 
            SET stage = ${nextStage}::"ProjectStage", 
                "completedAt" = ${completedAt || null}::timestamp,
                version = version + 1,
                "updatedAt" = NOW()
            WHERE id = ${projectId}::uuid AND version = ${version}
        `;

        // Verify update succeeded (version matched)
        const updated = await tx.project.findUnique({
            where: { id: projectId },
            select: { version: true }
        });

        if (!updated || updated.version !== version + 1) {
            throw AppError.conflict(
                'Project modified by another user during update',
                'VERSION_CONFLICT',
                { currentVersion: updated?.version, expectedVersion: version }
            );
        }

        // Fetch full updated project
        const updatedProject = await tx.project.findUnique({
            where: { id: projectId },
            include: {
                assignedDesigner: true,
                assignedDevManager: true,
                assignedQA: true
            }
        });

        // Create history entry
        await tx.historyItem.create({
            data: {
                stage: historyEntry.stage,
                action: historyEntry.action,
                timestamp: historyEntry.timestamp,
                userId: historyEntry.userId,
                projectId: project.id,
                tenantId
            }
        });

        // Create score entries
        for (const score of scoresToCreate) {
            await tx.scoreEntry.create({
                data: {
                    ...score
                }
            });
        }

        return updatedProject;
    });

    return result;
}

/**
 * Record QA feedback (pass/fail)
 * Server calculates all scoring implications
 */
export async function recordQAFeedback(params: QAFeedbackParams) {
    const { projectId, passed, userId, tenantId, version } = params;

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { id: true, stage: true, version: true, assignedDevManagerId: true, qaFailCount: true, qaChecklist: true, tenantId: true }
    });

    if (!project) {
        throw AppError.notFound('Project not found or access denied', 'PROJECT_NOT_FOUND');
    }

    // VERSION ENFORCEMENT: Check for conflicts
    if (project.version !== version) {
        throw AppError.conflict(
            'Project modified by another user',
            'VERSION_CONFLICT',
            { currentVersion: project.version, expectedVersion: version }
        );
    }

    if (!project.assignedDevManagerId) {
        throw AppError.badRequest('Project has no assigned dev manager', 'NO_DEV_MANAGER');
    }

    if (project.stage !== 'QA') {
        throw AppError.badRequest('QA Feedback can only be recorded when project is in QA stage', 'INVALID_STAGE_FOR_QA');
    }

    if (passed) {
        // QA Passed - advance to ADMIN_REVIEW
        const scoresToCreate: any[] = [];

        // Award QA First Pass bonus if this is the first pass
        if (project.qaFailCount === 0) {
            scoresToCreate.push({
                projectId: project.id,
                userId: project.assignedDevManagerId,
                points: SCORING_RULES.QA_FIRST_PASS,
                reason: 'QA First Pass Bonus',
                date: new Date().toISOString(),
                tenantId
            });
        }

        // Transaction: Advance stage + create scores
        const result = await prisma.$transaction(async (tx) => {
            // Update project with version increment (atomic)
            await tx.$executeRaw`
                UPDATE "Project" 
                SET stage = 'ADMIN_REVIEW'::"ProjectStage",
                    version = version + 1,
                    "updatedAt" = NOW()
                WHERE id = ${projectId}::uuid AND version = ${version}
            `;

            // Verify update succeeded (version matched)
            const updated = await tx.project.findUnique({
                where: { id: projectId },
                select: { version: true }
            });

            if (!updated || updated.version !== version + 1) {
                throw AppError.conflict(
                    'Project modified by another user during update',
                    'VERSION_CONFLICT',
                    { currentVersion: updated?.version, expectedVersion: version }
                );
            }

            // Fetch full updated project
            const updatedProject = await tx.project.findUnique({
                where: { id: projectId },
                include: {
                    assignedDesigner: true,
                    assignedDevManager: true,
                    assignedQA: true
                }
            });

            // Create history
            await tx.historyItem.create({
                data: {
                    stage: 'QA',
                    action: 'QA Passed - Advanced to Admin Review',
                    timestamp: new Date().toISOString(),
                    userId,
                    projectId: project.id,
                    tenantId
                }
            });

            // Create scores
            for (const score of scoresToCreate) {
                await tx.scoreEntry.create({
                    data: {
                        ...score
                    }
                });
            }

            return updatedProject;
        });

        return result;
    } else {
        // QA Failed - return to DEVELOPMENT
        const snapshot = project.qaChecklist;
        const resetQA = Array.isArray(project.qaChecklist)
            ? (project.qaChecklist as any[]).map((i: any) => ({ ...i, completed: false }))
            : [];

        const result = await prisma.$transaction(async (tx) => {
            // Update project with version increment (atomic)
            await tx.$executeRaw`
                UPDATE "Project" 
                SET stage = 'DEVELOPMENT'::"ProjectStage",
                    "qaFailCount" = ${(project.qaFailCount || 0) + 1},
                    "qaChecklist" = ${JSON.stringify(resetQA)}::jsonb,
                    version = version + 1,
                    "updatedAt" = NOW()
                WHERE id = ${projectId}::uuid AND version = ${version}
            `;

            // Verify update succeeded (version matched)
            const updated = await tx.project.findUnique({
                where: { id: projectId },
                select: { version: true }
            });

            if (!updated || updated.version !== version + 1) {
                throw AppError.conflict(
                    'Project modified by another user during update',
                    'VERSION_CONFLICT',
                    { currentVersion: updated?.version, expectedVersion: version }
                );
            }

            // Fetch full updated project
            const updatedProject = await tx.project.findUnique({
                where: { id: projectId },
                include: {
                    assignedDesigner: true,
                    assignedDevManager: true,
                    assignedQA: true
                }
            });

            // Create history with rejection snapshot
            await tx.historyItem.create({
                data: {
                    stage: 'QA',
                    action: 'QA Failed - Returned to Dev Manager',
                    timestamp: new Date().toISOString(),
                    userId,
                    rejectionSnapshot: snapshot,
                    projectId: project.id,
                    tenantId
                }
            });

            // Create penalty score
            await tx.scoreEntry.create({
                data: {
                    projectId: project.id,
                    userId: project.assignedDevManagerId!,
                    points: SCORING_RULES.QA_REJECTION,
                    reason: 'QA Rejection Penalty',
                    date: new Date().toISOString(),
                    tenantId
                }
            });

            return updatedProject;
        });

        return result;
    }
}
