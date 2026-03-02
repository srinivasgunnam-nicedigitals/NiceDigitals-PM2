import { prisma } from '../config/db';
import { differenceInDays, parseISO } from 'date-fns';
import { AppError } from '../utils/AppError';
import { logAudit } from '../utils/audit';
import { realtimeService } from '../realtime/RealtimeService';
import { computeExecutionHealth } from './execution-health.service';
import { invalidateHealthCache } from './health-cache';
import { ProjectStage, UserRole, RevertReasonCategory } from '@prisma/client';

// Scoring rules
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
    'DISCOVERY': ['DESIGN'],
    'DESIGN': ['CLIENT_REVIEW'],
    'CLIENT_REVIEW': ['DEVELOPMENT', 'DESIGN'], // -> Design is rejected
    'DEVELOPMENT': ['INTERNAL_QA', 'DESIGN'], // -> Design is clarification loop
    'INTERNAL_QA': ['INTERNAL_APPROVAL', 'DEVELOPMENT'], // -> Dev is failed
    'INTERNAL_APPROVAL': ['CLIENT_UAT'],
    'CLIENT_UAT': ['DEPLOYMENT', 'INTERNAL_QA'], // -> Internal QA is client raised fixes
    'DEPLOYMENT': ['COMPLETED'],
    'COMPLETED': ['DEPLOYMENT', 'INTERNAL_APPROVAL'] // allowing unarchive
};

export const ROLE_STAGE_AUTHORITY: Record<string, string[]> = {
    'DISCOVERY->DESIGN': ['ADMIN'],
    'DESIGN->CLIENT_REVIEW': ['DESIGNER', 'ADMIN'],
    'CLIENT_REVIEW->DEVELOPMENT': ['ADMIN'],
    'CLIENT_REVIEW->DESIGN': ['ADMIN'],
    'DEVELOPMENT->INTERNAL_QA': ['DEV_MANAGER', 'ADMIN'],
    'INTERNAL_QA->DEVELOPMENT': ['QA_ENGINEER', 'ADMIN'],
    'INTERNAL_QA->INTERNAL_APPROVAL': ['QA_ENGINEER', 'ADMIN'],
    'INTERNAL_APPROVAL->CLIENT_UAT': ['ADMIN'],
    'CLIENT_UAT->INTERNAL_QA': ['ADMIN'],
    'CLIENT_UAT->DEPLOYMENT': ['ADMIN'],
    'DEPLOYMENT->COMPLETED': ['DEV_MANAGER', 'ADMIN'],
    'DEVELOPMENT->DESIGN': ['DEV_MANAGER', 'ADMIN'],
    'COMPLETED->INTERNAL_APPROVAL': ['ADMIN']
};

export const BACKWARD_TRANSITIONS = new Set([
    'CLIENT_REVIEW->DESIGN',
    'DEVELOPMENT->DESIGN',
    'INTERNAL_QA->DEVELOPMENT',
    'CLIENT_UAT->INTERNAL_QA',
    'COMPLETED->INTERNAL_APPROVAL'
]);

interface AdvanceStageParams {
    projectId: string;
    nextStage: string;
    userId: string;
    tenantId: string;
    version: number;
    userRole: string;
    revertReasonCategory?: RevertReasonCategory;
    revertReasonNote?: string;
}

export async function advanceProjectStage(params: AdvanceStageParams) {
    const { projectId, nextStage, userId, tenantId, version, userRole, revertReasonCategory, revertReasonNote } = params;

    const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId },
        select: { 
            id: true, stage: true, version: true, 
            assignedDesignerId: true, assignedDevManagerId: true, assignedQAId: true, 
            overallDeadline: true, qaFailCount: true, qaChecklist: true, tenantId: true,
            devChecklist: true, designChecklist: true, finalChecklist: true
        }
    });

    if (!project) {
        throw AppError.notFound('Project not found or access denied', 'PROJECT_NOT_FOUND');
    }

    // 1. Version Enforcement
    if (project.version !== version) {
        throw AppError.conflict('Project modified by another user', 'VERSION_CONFLICT', { currentVersion: project.version, expectedVersion: version });
    }

    // 2. Validate Transition
    const allowed = VALID_TRANSITIONS[project.stage] || [];
    if (!allowed.includes(nextStage)) {
        throw AppError.badRequest(`Invalid stage transition: Cannot move from ${project.stage} to ${nextStage}`, 'INVALID_TRANSITION');
    }

    // 3. Role-Stage Authority & Assignment combination
    const transitionKey = `${project.stage}->${nextStage}`;
    const authorizedRoles = ROLE_STAGE_AUTHORITY[transitionKey] || ['ADMIN']; // fallback

    // If not admin, check if their role is in authorizedRoles AND if they are the assigned person
    let hasAuthority = false;
    if (userRole === 'ADMIN') {
        hasAuthority = true;
    } else {
        if (authorizedRoles.includes(userRole)) {
            // Check assignment mapping based on userRole
            if (userRole === 'DESIGNER' && project.assignedDesignerId === userId) hasAuthority = true;
            if (userRole === 'DEV_MANAGER' && project.assignedDevManagerId === userId) hasAuthority = true;
            if (userRole === 'QA_ENGINEER' && project.assignedQAId === userId) hasAuthority = true;
        }
    }

    if (!hasAuthority) {
        throw AppError.forbidden(`You do not have authority to move from ${project.stage} to ${nextStage}`, 'NOT_AUTHORIZED');
    }

    // 4. Backward Transition Guards
    const isBackward = BACKWARD_TRANSITIONS.has(transitionKey);
    if (isBackward) {
        if (!revertReasonCategory || !revertReasonNote || revertReasonNote.length < 15) {
            throw AppError.badRequest('Backward transitions require a valid reason category and a descriptive note (min 15 chars).', 'REVERT_REASON_REQUIRED');
        }
    }

    // 5. Checklist Warnings (Non-blocking)
    let checklistWarning = false;
    if (project.stage === 'DESIGN' && nextStage === 'CLIENT_REVIEW') {
        const cl = project.designChecklist as any[] || [];
        if (cl.length > 0 && cl.some(c => !c.completed)) checklistWarning = true;
    } else if (project.stage === 'DEVELOPMENT' && nextStage === 'INTERNAL_QA') {
        const cl = project.devChecklist as any[] || [];
        if (cl.length > 0 && cl.some(c => !c.completed)) checklistWarning = true;
    }

    // QA Reject special handling
    let newQaFailCount = project.qaFailCount;
    let newQaChecklist = project.qaChecklist;
    let rejectionSnapshot = undefined;

    if (project.stage === 'INTERNAL_QA' && nextStage === 'DEVELOPMENT') {
        newQaFailCount = (newQaFailCount || 0) + 1;
        rejectionSnapshot = project.qaChecklist;
        newQaChecklist = Array.isArray(project.qaChecklist) 
            ? (project.qaChecklist as any[]).map((i: any) => ({ ...i, completed: false }))
            : [];
    }

    // CLIENT_UAT → INTERNAL_QA: Reset QA checklist (UAT feedback implies code changes, QA must retest)
    if (project.stage === 'CLIENT_UAT' && nextStage === 'INTERNAL_QA') {
        newQaChecklist = Array.isArray(project.qaChecklist)
            ? (project.qaChecklist as any[]).map((i: any) => ({ ...i, completed: false }))
            : [];
    }

    let newDesignChecklist = project.designChecklist;
    if (project.stage === 'CLIENT_REVIEW' && nextStage === 'DESIGN') {
        newDesignChecklist = Array.isArray(project.designChecklist)
            ? (project.designChecklist as any[]).map((i: any) => ({ ...i, completed: false }))
            : [];
    }

    let newFinalChecklist = project.finalChecklist;
    if (project.stage === 'COMPLETED' && nextStage === 'INTERNAL_APPROVAL') {
        newFinalChecklist = Array.isArray(project.finalChecklist)
            ? (project.finalChecklist as any[]).map((i: any) => ({ ...i, completed: false }))
            : [];
    }

    // Create history entry basis
    const actionDesc = isBackward 
        ? `Reverted to ${nextStage.replace(/_/g, ' ')}` 
        : `Advanced to ${nextStage.replace(/_/g, ' ')}`;

    // 6. Stage-Exit Checklist Completion Capture (for Discipline Engine)
    let checklistCompletionRate: number | null = null;
    if (!isBackward) {
        const STAGE_CHECKLIST_MAP: Record<string, string> = {
            'DESIGN': 'designChecklist',
            'DEVELOPMENT': 'devChecklist',
            'INTERNAL_QA': 'qaChecklist',
            'INTERNAL_APPROVAL': 'finalChecklist',
            'CLIENT_REVIEW': 'clientReviewChecklist',
            'CLIENT_UAT': 'clientUatChecklist',
            'DEPLOYMENT': 'deploymentChecklist'
        };
        const checklistField = STAGE_CHECKLIST_MAP[project.stage];
        if (checklistField) {
            const checklist = (project as any)[checklistField] as any[] || [];
            if (checklist.length > 0) {
                const completed = checklist.filter((c: any) => c.completed).length;
                checklistCompletionRate = completed / checklist.length;
            }
        }
    }

    let completedAt: string | null = null;
    const scoresToCreate: any[] = [];

    // Scoring logic (Simplified for Phase 1, robust in Phase 2)
    if (nextStage === 'COMPLETED' && project.assignedDevManagerId) {
        const today = new Date();
        const overallDeadline = new Date(project.overallDeadline);

        scoresToCreate.push({
            projectId: project.id,
            userId: project.assignedDevManagerId,
            points: SCORING_RULES.DELIVERY,
            reason: 'Project Delivery',
            date: today.toISOString(),
            tenantId
        });

        if (differenceInDays(overallDeadline, today) >= 0) {
            scoresToCreate.push({
                projectId: project.id,
                userId: project.assignedDevManagerId,
                points: SCORING_RULES.ON_TIME,
                reason: 'On-Time Bonus',
                date: today.toISOString(),
                tenantId
            });
        } else {
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

    // 7. Snapshot execution health BEFORE marking COMPLETED (for calibration)
    let healthAtCompletion: number | null = null;
    if (nextStage === 'COMPLETED') {
        try {
            const health = await computeExecutionHealth(projectId);
            healthAtCompletion = health.executionHealth;
        } catch {
            // Non-blocking: if health compute fails, we still complete the project
            healthAtCompletion = null;
        }
    }

    if (project.stage === 'INTERNAL_QA' && nextStage === 'INTERNAL_APPROVAL' && (project.qaFailCount === 0 || project.qaFailCount === null) && project.assignedDevManagerId) {
        scoresToCreate.push({
            projectId: project.id,
            userId: project.assignedDevManagerId,
            points: SCORING_RULES.QA_FIRST_PASS,
            reason: 'QA First Pass Bonus',
            date: new Date().toISOString(),
            tenantId
        });
    }

    if (project.stage === 'INTERNAL_QA' && nextStage === 'DEVELOPMENT' && project.assignedDevManagerId) {
        scoresToCreate.push({
            projectId: project.id,
            userId: project.assignedDevManagerId,
            points: SCORING_RULES.QA_REJECTION,
            reason: 'QA Rejection Penalty',
            date: new Date().toISOString(),
            tenantId
        });
    }

    const result = await prisma.$transaction(async (tx) => {
        // Atomic Update
        await tx.$executeRaw`
            UPDATE "Project" 
            SET stage = ${nextStage}::"ProjectStage", 
                "completedAt" = ${completedAt ? new Date(completedAt) : null}::timestamp,
                "enteredStageAt" = NOW(),
                "qaFailCount" = ${newQaFailCount},
                "qaChecklist" = ${newQaChecklist && Array.isArray(newQaChecklist) ? newQaChecklist.map((x: any) => JSON.stringify(x)) : []}::jsonb[],
                "designChecklist" = ${newDesignChecklist && Array.isArray(newDesignChecklist) ? newDesignChecklist.map((x: any) => JSON.stringify(x)) : []}::jsonb[],
                "finalChecklist" = ${newFinalChecklist && Array.isArray(newFinalChecklist) ? newFinalChecklist.map((x: any) => JSON.stringify(x)) : []}::jsonb[],
                "healthAtCompletion" = ${healthAtCompletion},
                version = version + 1,
                "updatedAt" = NOW()
            WHERE id = ${projectId} AND "tenantId" = ${tenantId} AND version = ${version}
        `;

        const updated = await tx.project.findUnique({ where: { id: projectId }, select: { version: true } });
        if (!updated || updated.version !== version + 1) {
            throw AppError.conflict('Project modified by another user during update', 'VERSION_CONFLICT');
        }

        const updatedProject = await tx.project.findUnique({
            where: { id: projectId },
            include: { assignedDesigner: true, assignedDevManager: true, assignedQA: true }
        });

        // History
        await tx.historyItem.create({
            data: {
                stage: project.stage,
                toStage: nextStage as any,
                action: actionDesc,
                timestamp: new Date().toISOString(),
                userId: userId,
                performedByUserId: userId,
                performedByRole: userRole as any,
                revertReasonCategory: isBackward ? revertReasonCategory || 'OTHER' : null,
                revertReasonNote: isBackward ? revertReasonNote : null,
                rejectionSnapshot: rejectionSnapshot,
                checklistCompletionRate: checklistCompletionRate,
                projectId: project.id,
                tenantId
            }
        });

        if (checklistWarning) {
            await tx.historyItem.create({
                data: {
                    stage: project.stage,
                    toStage: nextStage as any,
                    action: 'CHECKLIST_INCOMPLETE_WARNING',
                    timestamp: new Date().toISOString(),
                    userId: userId,
                    performedByUserId: userId,
                    performedByRole: userRole as any,
                    projectId: project.id,
                    tenantId
                }
            });
        }

        for (const score of scoresToCreate) {
            await tx.scoreEntry.create({ data: { ...score } });
        }

        await logAudit({
            action: 'STAGE_ADVANCED',
            target: `Project: ${projectId}`,
            actorId: userId,
            actorEmail: '',
            tenantId,
            metadata: { previousStage: project.stage, nextStage, version, newVersion: version + 1 }
        }, tx);

        return updatedProject;
    });

    realtimeService.emitInvalidate(tenantId, ['projects', 'kanban', 'projectStats', 'rankings', 'notifications']);
    invalidateHealthCache(projectId);
    return result;
}

export type KanbanStage = 'DISCOVERY' | 'DESIGN' | 'CLIENT_REVIEW' | 'DEVELOPMENT' | 'INTERNAL_QA' | 'INTERNAL_APPROVAL' | 'CLIENT_UAT' | 'DEPLOYMENT';

export interface KanbanColumn {
    items: any[];
    total: number;
    hasMore: boolean;
}

export type KanbanBoard = Record<KanbanStage, KanbanColumn>;

const KANBAN_STAGES: KanbanStage[] = [
    'DISCOVERY', 'DESIGN', 'CLIENT_REVIEW', 'DEVELOPMENT', 'INTERNAL_QA', 'INTERNAL_APPROVAL', 'CLIENT_UAT', 'DEPLOYMENT'
];

const KANBAN_SELECT = {
    id: true, name: true, clientName: true, priority: true, stage: true, overallDeadline: true, isDelayed: true,
    createdAt: true, tenantId: true, version: true, assignedDesignerId: true, assignedDevManagerId: true, assignedQAId: true,
    scope: true, designChecklist: true, devChecklist: true, qaChecklist: true, finalChecklist: true,
    assignedDesigner: { select: { id: true, name: true, avatar: true } },
    assignedDevManager: { select: { id: true, name: true, avatar: true } },
    assignedQA: { select: { id: true, name: true, avatar: true } },
} as const;

export async function getKanbanView(tenantId: string, limitPerStage = 20): Promise<KanbanBoard> {
    const results = await Promise.all(
        KANBAN_STAGES.map(async (stage) => {
            const [items, total] = await Promise.all([
                prisma.project.findMany({
                    where: { tenantId, stage: stage as any },
                    select: KANBAN_SELECT,
                    orderBy: { overallDeadline: 'asc' },
                    take: limitPerStage,
                }),
                prisma.project.count({ where: { tenantId, stage: stage as any } }),
            ]);
            return { stage, items, total, hasMore: total > limitPerStage };
        })
    );

    return results.reduce((board, { stage, items, total, hasMore }) => {
        board[stage] = { items, total, hasMore };
        return board;
    }, {} as KanbanBoard);
}
