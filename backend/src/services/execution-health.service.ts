import { prisma } from '../config/db';
import { performance } from 'perf_hooks';

// =============================================
// PHASE 2B — EXECUTION HEALTH ENGINE
// =============================================
// Deterministic, explainable, per-project risk scoring.
// Pure compute — no DB writes.
//
// Output: executionHealth (0–100), deliveryConfidence (5–95),
//         atRisk flag, and full breakdown.

// Revert severity weights (shared with discipline engine)
const REVERT_SEVERITY: Record<string, number> = {
    CLIENT_CHANGE_REQUEST: 0.3,
    DESIGN_CLARIFICATION: 0.3,
    DEV_IMPLEMENTATION_BUG: 0.6,
    QA_MISS: 0.6,
    CONTENT_MISSING: 0.6,
    PERFORMANCE_ISSUE: 1.0,
    SCOPE_EXPANSION: 1.0,
    OTHER: 0.5,
};

export interface ExecutionHealthResult {
    executionHealth: number;
    deliveryConfidence: number;
    atRisk: boolean;
    breakdown: {
        deadlinePressure: number;
        reworkInstability: number;
        checklistPenalty: number;
        stageDeviation: number;
        disciplineModifier: number;
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

// =============================================
// DOMAIN 1: DEADLINE PRESSURE (Max 40)
// =============================================
async function computeDeadlinePressure(
    overallDeadline: Date,
    currentStage: string,
    tenantId: string
): Promise<number> {
    const now = new Date();
    const daysRemaining = (overallDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Estimate remaining completion days using tenant median stage durations
    const stageOrder = [
        'DISCOVERY', 'DESIGN', 'CLIENT_REVIEW', 'DEVELOPMENT',
        'INTERNAL_QA', 'INTERNAL_APPROVAL', 'CLIENT_UAT', 'DEPLOYMENT', 'COMPLETED'
    ];
    const currentIndex = stageOrder.indexOf(currentStage);
    const remainingStages = stageOrder.slice(currentIndex + 1).filter(s => s !== 'COMPLETED');

    // Get tenant median duration for remaining stages
    let estimatedCompletionDays = 0;
    if (remainingStages.length > 0) {
        for (const stage of remainingStages) {
            // Find forward transitions OUT of this stage to compute median duration
            const transitions = await prisma.historyItem.findMany({
                where: {
                    tenantId,
                    stage: stage as any,
                    revertReasonCategory: null, // forward only
                },
                select: { timestamp: true, projectId: true }
            });

            const durations: number[] = [];
            for (const t of transitions) {
                const entry = await prisma.historyItem.findFirst({
                    where: {
                        projectId: t.projectId,
                        tenantId,
                        toStage: stage as any,
                        timestamp: { lt: t.timestamp }
                    },
                    orderBy: { timestamp: 'desc' },
                    select: { timestamp: true }
                });
                if (entry) {
                    const days = (t.timestamp.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
                    if (days > 0) durations.push(days);
                }
            }

            if (durations.length > 0) {
                durations.sort((a, b) => a - b);
                const median = durations.length % 2 === 0
                    ? (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
                    : durations[Math.floor(durations.length / 2)];
                estimatedCompletionDays += median;
            } else {
                estimatedCompletionDays += 3; // Default if no data
            }
        }
    }

    const buffer = daysRemaining - estimatedCompletionDays;

    let risk = 0;
    if (buffer > 7) risk = 0;
    else if (buffer >= 3) risk = 10;
    else if (buffer >= 0) risk = 20;
    else if (buffer >= -7) risk = 35;
    else risk = 40;

    return clamp(risk, 0, 40);
}

// =============================================
// DOMAIN 2: REWORK INSTABILITY (Max 30)
// =============================================
async function computeReworkInstability(
    projectId: string,
    tenantId: string
): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reverts = await prisma.historyItem.findMany({
        where: {
            projectId,
            tenantId,
            revertReasonCategory: { not: null },
            timestamp: { gte: thirtyDaysAgo }
        },
        select: { revertReasonCategory: true }
    });

    if (reverts.length === 0) return 0;

    let weightedSum = 0;
    for (const rev of reverts) {
        const severity = REVERT_SEVERITY[rev.revertReasonCategory || 'OTHER'] || 0.5;
        weightedSum += severity;
    }

    // Scale: 0→0, low single→8, medium repeated→15, high multiple→25-30
    let risk = 0;
    if (weightedSum <= 0.3) risk = 5;
    else if (weightedSum <= 0.6) risk = 8;
    else if (weightedSum <= 1.5) risk = 12;
    else if (weightedSum <= 2.5) risk = 18;
    else if (weightedSum <= 4.0) risk = 25;
    else risk = 30;

    return clamp(risk, 0, 30);
}

// =============================================
// DOMAIN 3: CHECKLIST PENALTY (Max 20)
// =============================================
function computeChecklistPenalty(project: any): number {
    const STAGE_CHECKLIST_MAP: Record<string, string> = {
        'DESIGN': 'designChecklist',
        'DEVELOPMENT': 'devChecklist',
        'INTERNAL_QA': 'qaChecklist',
        'INTERNAL_APPROVAL': 'finalChecklist',
    };

    const checklistField = STAGE_CHECKLIST_MAP[project.stage];
    if (!checklistField) return 0;

    const checklist = project[checklistField] as any[] || [];
    if (checklist.length === 0) return 5; // Unconfigured checklist ≠ perfect — neutral penalty

    const completed = checklist.filter((c: any) => c.completed).length;
    const completionRate = completed / checklist.length;

    if (completionRate >= 0.95) return 0;
    if (completionRate >= 0.80) return 5;
    if (completionRate >= 0.60) return 10;
    return 20;
}

// =============================================
// DOMAIN 4: STAGE DURATION DEVIATION (Max 20)
// =============================================
async function computeStageDeviation(
    enteredStageAt: Date | null,
    currentStage: string,
    tenantId: string
): Promise<number> {
    if (!enteredStageAt) return 0;

    const now = new Date();
    const daysInStage = (now.getTime() - enteredStageAt.getTime()) / (1000 * 60 * 60 * 24);

    // Get tenant median for this stage
    const transitions = await prisma.historyItem.findMany({
        where: {
            tenantId,
            stage: currentStage as any,
            revertReasonCategory: null, // forward only
        },
        select: { timestamp: true, projectId: true }
    });

    const durations: number[] = [];
    for (const t of transitions) {
        const entry = await prisma.historyItem.findFirst({
            where: {
                projectId: t.projectId,
                tenantId,
                toStage: currentStage as any,
                timestamp: { lt: t.timestamp }
            },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true }
        });
        if (entry) {
            const days = (t.timestamp.getTime() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
            if (days > 0) durations.push(days);
        }
    }

    if (durations.length === 0) return 0; // No baseline data

    // MEDIAN
    durations.sort((a, b) => a - b);
    const tenantMedian = durations.length % 2 === 0
        ? (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
        : durations[Math.floor(durations.length / 2)];

    if (tenantMedian <= 0) return 0;

    const deviationPct = (daysInStage - tenantMedian) / tenantMedian;

    if (deviationPct <= 0.10) return 0;
    if (deviationPct <= 0.25) return 10;
    return 20;
}

// =============================================
// DOMAIN 5: TEAM DISCIPLINE MODIFIER (-15 to +10)
// =============================================
async function computeDisciplineModifier(
    assignedDesignerId: string | null,
    assignedDevManagerId: string | null,
    assignedQAId: string | null,
    tenantId: string
): Promise<number> {
    const userIds = [assignedDesignerId, assignedDevManagerId, assignedQAId].filter(Boolean) as string[];

    if (userIds.length === 0) return 0;

    const snapshots = await prisma.disciplineSnapshot.findMany({
        where: {
            tenantId,
            userId: { in: userIds }
        },
        orderBy: { snapshotDate: 'desc' },
        distinct: ['userId'], // Latest per user
    });

    if (snapshots.length === 0) return 0;

    const avgDiscipline = snapshots.reduce((sum: number, s: any) => sum + s.disciplineIndex, 0) / snapshots.length;

    if (avgDiscipline >= 75) return -15;
    if (avgDiscipline >= 60) return -5;
    if (avgDiscipline >= 40) return 0;
    return 10;
}

// =============================================
// MAIN ORCHESTRATOR
// =============================================
export async function computeExecutionHealth(projectId: string): Promise<ExecutionHealthResult> {
    const start = performance.now();

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
            id: true, stage: true, overallDeadline: true, tenantId: true,
            enteredStageAt: true, assignedDesignerId: true,
            assignedDevManagerId: true, assignedQAId: true,
            designChecklist: true, devChecklist: true,
            qaChecklist: true, finalChecklist: true,
        }
    });

    if (!project) throw new Error(`Project ${projectId} not found`);

    // Skip completed projects
    if (project.stage === 'COMPLETED') {
        return {
            executionHealth: 0,
            deliveryConfidence: 95,
            atRisk: false,
            breakdown: {
                deadlinePressure: 0,
                reworkInstability: 0,
                checklistPenalty: 0,
                stageDeviation: 0,
                disciplineModifier: 0,
            }
        };
    }

    // Compute all 5 domains in parallel where possible
    const [deadlinePressure, reworkInstability, stageDeviation, disciplineModifier] = await Promise.all([
        computeDeadlinePressure(project.overallDeadline, project.stage, project.tenantId),
        computeReworkInstability(project.id, project.tenantId),
        computeStageDeviation(project.enteredStageAt, project.stage, project.tenantId),
        computeDisciplineModifier(
            project.assignedDesignerId,
            project.assignedDevManagerId,
            project.assignedQAId,
            project.tenantId
        ),
    ]);

    // Checklist is synchronous (data already fetched)
    const checklistPenalty = computeChecklistPenalty(project);

    const rawRisk =
        deadlinePressure +
        reworkInstability +
        checklistPenalty +
        stageDeviation +
        disciplineModifier;

    const executionHealth = clamp(rawRisk, 0, 100);
    const deliveryConfidence = clamp(100 - executionHealth, 5, 95);
    const atRisk = executionHealth >= 60;

    // Performance instrumentation
    const duration = performance.now() - start;
    if (duration > 50) {
        console.warn(`[HealthPerf] SLOW compute for project ${projectId}: ${duration.toFixed(1)}ms`);
    }

    return {
        executionHealth,
        deliveryConfidence,
        atRisk,
        breakdown: {
            deadlinePressure,
            reworkInstability,
            checklistPenalty,
            stageDeviation,
            disciplineModifier,
        }
    };
}
