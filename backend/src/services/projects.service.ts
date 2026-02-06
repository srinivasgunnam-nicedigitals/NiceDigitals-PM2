import { prisma } from '../config/db';
import { differenceInDays, parseISO } from 'date-fns';

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
}

interface QAFeedbackParams {
    projectId: string;
    passed: boolean;
    userId: string;
    tenantId: string;
}

/**
 * Advance a project to the next stage
 * This is the authoritative server-side implementation
 * Frontend should NEVER calculate scores or stage transitions
 */
export async function advanceProjectStage(params: AdvanceStageParams) {
    const { projectId, nextStage, userId, tenantId } = params;

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId }
    });

    if (!project) {
        throw new Error('Project not found or access denied');
    }

    // State Machine Validation
    const allowed = VALID_TRANSITIONS[project.stage] || [];
    if (!allowed.includes(nextStage)) {
        throw new Error(`Invalid stage transition: Cannot move from ${project.stage} to ${nextStage}`);
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
        // Update project
        const updatedProject = await tx.project.update({
            where: { id: projectId },
            data: {
                stage: nextStage as any,
                completedAt: completedAt || undefined,
            },
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
    const { projectId, passed, userId, tenantId } = params;

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId }
    });

    if (!project) {
        throw new Error('Project not found or access denied');
    }

    if (!project.assignedDevManagerId) {
        throw new Error('Project has no assigned dev manager');
    }

    if (project.stage !== 'QA') {
        throw new Error('QA Feedback can only be recorded when project is in QA stage');
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
            const updatedProject = await tx.project.update({
                where: { id: projectId },
                data: {
                    stage: 'ADMIN_REVIEW'
                },
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
            const updatedProject = await tx.project.update({
                where: { id: projectId },
                data: {
                    stage: 'DEVELOPMENT' as any,
                    qaFailCount: (project.qaFailCount || 0) + 1,
                    qaChecklist: resetQA as any
                },
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
