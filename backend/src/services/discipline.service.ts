import { prisma } from '../config/db';
import { UserRole } from '@prisma/client';

// =============================================
// PHASE 2A — BEHAVIORAL DISCIPLINE ENGINE
// =============================================
// 5 signals, each normalized to [-1, +1]
// Balanced model: equal positive + negative weight
// Semi-transparent: users see signals, not weights

// Severity weights per revert reason category
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

const HIGH_SEVERITY_CATEGORIES = ['PERFORMANCE_ISSUE', 'SCOPE_EXPANSION'];

// Clamp value to [-1, +1]
function clamp(value: number): number {
    return Math.max(-1, Math.min(1, value));
}

// =============================================
// SIGNAL 1: QA STABILITY
// =============================================
// QA Engineers: based on their QA pass/fail decisions
// Dev Managers: QA impact flows through Rework signal instead
async function computeQaSignal(tenantId: string, userId: string, userRole: UserRole, thirtyDaysAgo: Date) {
    let firstPassCount = 0;
    let rejectCount = 0;

    if (userRole === 'QA_ENGINEER') {
        // QA transitions performed by this user
        const qaTransitions = await prisma.historyItem.findMany({
            where: {
                tenantId,
                performedByUserId: userId,
                stage: 'INTERNAL_QA',
                toStage: { in: ['INTERNAL_APPROVAL', 'DEVELOPMENT'] },
                timestamp: { gte: thirtyDaysAgo }
            },
            select: { toStage: true }
        });

        firstPassCount = qaTransitions.filter(t => t.toStage === 'INTERNAL_APPROVAL').length;
        rejectCount = qaTransitions.filter(t => t.toStage === 'DEVELOPMENT').length;
    } else if (userRole === 'DEV_MANAGER') {
        // For dev managers: QA results on projects they own
        const devProjects = await prisma.project.findMany({
            where: { tenantId, assignedDevManagerId: userId },
            select: { id: true }
        });
        const projectIds = devProjects.map(p => p.id);

        if (projectIds.length > 0) {
            const qaTransitions = await prisma.historyItem.findMany({
                where: {
                    tenantId,
                    stage: 'INTERNAL_QA',
                    toStage: { in: ['INTERNAL_APPROVAL', 'DEVELOPMENT'] },
                    projectId: { in: projectIds },
                    timestamp: { gte: thirtyDaysAgo }
                },
                select: { toStage: true }
            });

            firstPassCount = qaTransitions.filter(t => t.toStage === 'INTERNAL_APPROVAL').length;
            rejectCount = qaTransitions.filter(t => t.toStage === 'DEVELOPMENT').length;
        }
    }

    const totalEvents = firstPassCount + rejectCount;

    // Low-sample guard: if < 3 events, scale influence by 0.5
    let sampleScale = 1.0;
    if (totalEvents < 3) sampleScale = 0.5;

    let domainScore = 0;
    if (totalEvents > 0) {
        const firstPassRate = firstPassCount / totalEvents;
        if (firstPassRate >= 0.8) domainScore = 1.0;
        else if (firstPassRate >= 0.6) domainScore = 0.3;
        else if (firstPassRate >= 0.4) domainScore = 0;
        else domainScore = -1.0;
    }

    return {
        qaDomainScore: clamp(domainScore * sampleScale),
        qaFirstPassCount: firstPassCount,
        qaRejectCount: rejectCount
    };
}

// =============================================
// SIGNAL 2: REWORK (Tenant-Relative)
// =============================================
async function computeReworkSignal(tenantId: string, userId: string, thirtyDaysAgo: Date) {
    // User's backward transitions
    const userReverts = await prisma.historyItem.findMany({
        where: {
            tenantId,
            performedByUserId: userId,
            revertReasonCategory: { not: null },
            timestamp: { gte: thirtyDaysAgo }
        },
        select: { revertReasonCategory: true }
    });

    const revertCount = userReverts.length;
    let userWeightedReverts = 0;
    let highSevRevertCount = 0;

    for (const rev of userReverts) {
        const severity = REVERT_SEVERITY[rev.revertReasonCategory || 'OTHER'] || 0.5;
        userWeightedReverts += severity;
        if (HIGH_SEVERITY_CATEGORIES.includes(rev.revertReasonCategory || '')) {
            highSevRevertCount++;
        }
    }

    // Tenant baseline: all users' weighted reverts in last 30 days
    const allTenantReverts = await prisma.historyItem.findMany({
        where: {
            tenantId,
            revertReasonCategory: { not: null },
            timestamp: { gte: thirtyDaysAgo }
        },
        select: { performedByUserId: true, revertReasonCategory: true }
    });

    // Group by user to compute tenant average + stddev
    const userRevertMap: Record<string, number> = {};
    for (const rev of allTenantReverts) {
        const uid = rev.performedByUserId || 'unknown';
        const severity = REVERT_SEVERITY[rev.revertReasonCategory || 'OTHER'] || 0.5;
        userRevertMap[uid] = (userRevertMap[uid] || 0) + severity;
    }

    const userValues = Object.values(userRevertMap);
    const tenantAvgReverts = userValues.length > 0
        ? userValues.reduce((a, b) => a + b, 0) / userValues.length
        : 0;

    let domainScore = 0;

    // Check if we have enough tenant data (30+ days implied by data density)
    if (userValues.length >= 3) {
        // Tenant-relative normalization
        const variance = userValues.reduce((sum, v) => sum + Math.pow(v - tenantAvgReverts, 2), 0) / userValues.length;
        let tenantStdDev = Math.sqrt(variance);
        // Epsilon guard: prevent explosion from low variance
        tenantStdDev = Math.max(tenantStdDev, 0.5);

        const deviation = (userWeightedReverts - tenantAvgReverts) / tenantStdDev;

        if (deviation <= -0.5) domainScore = 1.0;       // Much better than average
        else if (deviation <= 0.5) domainScore = 0.3;    // Around average
        else if (deviation <= 1.5) domainScore = -0.3;   // Somewhat worse
        else domainScore = -1.0;                          // Much worse
    } else {
        // Static fallback for new tenants
        if (userWeightedReverts === 0) domainScore = 1.0;
        else if (userWeightedReverts <= 1.5) domainScore = 0.3;
        else if (userWeightedReverts <= 3.0) domainScore = -0.3;
        else domainScore = -1.0;
    }

    return {
        reworkDomainScore: clamp(domainScore),
        revertCount,
        highSevRevertCount,
        tenantAvgReverts
    };
}

// =============================================
// SIGNAL 3: CHECKLIST DISCIPLINE (Stage-Exit)
// =============================================
async function computeChecklistSignal(tenantId: string, userId: string, thirtyDaysAgo: Date) {
    // Forward transitions by this user that have checklistCompletionRate captured
    const forwardTransitions = await prisma.historyItem.findMany({
        where: {
            tenantId,
            performedByUserId: userId,
            checklistCompletionRate: { not: null },
            revertReasonCategory: null, // Forward transitions only (no revert reason)
            timestamp: { gte: thirtyDaysAgo }
        },
        select: { checklistCompletionRate: true }
    });

    const rates = forwardTransitions
        .map(t => t.checklistCompletionRate)
        .filter((r): r is number => r !== null);

    const checklistAvgRate = rates.length > 0
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : 0;

    // Low-sample guard
    let sampleScale = 1.0;
    if (rates.length < 2) sampleScale = 0.5;

    let domainScore = 0;
    if (rates.length > 0) {
        if (checklistAvgRate >= 0.95) domainScore = 1.0;
        else if (checklistAvgRate >= 0.80) domainScore = 0.5;
        else if (checklistAvgRate >= 0.60) domainScore = 0;
        else domainScore = -1.0;
    }

    return {
        checklistDomainScore: clamp(domainScore * sampleScale),
        checklistAvgRate
    };
}

// =============================================
// SIGNAL 4: DEADLINE RELIABILITY
// =============================================
// Attribution: DEV_MANAGER owns deadline primarily
async function computeDeadlineSignal(tenantId: string, userId: string, userRole: UserRole, thirtyDaysAgo: Date) {
    // Only DEV_MANAGERs and ADMINs own deadline responsibility
    if (userRole !== 'DEV_MANAGER' && userRole !== 'ADMIN') {
        return { deadlineDomainScore: 0, onTimeRate: 0, avgDelayDays: 0 };
    }

    const completedProjects = await prisma.project.findMany({
        where: {
            tenantId,
            stage: 'COMPLETED',
            completedAt: { gte: thirtyDaysAgo },
            ...(userRole === 'DEV_MANAGER'
                ? { assignedDevManagerId: userId }
                : {})
        },
        select: { completedAt: true, overallDeadline: true }
    });

    if (completedProjects.length === 0) {
        return { deadlineDomainScore: 0, onTimeRate: 0, avgDelayDays: 0 };
    }

    let onTimeCount = 0;
    let totalDelayDays = 0;

    for (const p of completedProjects) {
        if (p.completedAt && p.completedAt <= p.overallDeadline) {
            onTimeCount++;
        } else if (p.completedAt) {
            const delay = (p.completedAt.getTime() - p.overallDeadline.getTime()) / (1000 * 60 * 60 * 24);
            totalDelayDays += delay;
        }
    }

    const onTimeRate = onTimeCount / completedProjects.length;
    const avgDelayDays = completedProjects.length > onTimeCount
        ? totalDelayDays / (completedProjects.length - onTimeCount)
        : 0;

    let domainScore = 0;
    if (onTimeRate >= 0.8) domainScore = 1.0;
    else if (onTimeRate >= 0.6) domainScore = 0.3;
    else domainScore = -1.0;

    return {
        deadlineDomainScore: clamp(domainScore),
        onTimeRate,
        avgDelayDays
    };
}

// =============================================
// SIGNAL 5: STAGE VELOCITY (with guardrail)
// =============================================
// Uses MEDIAN not mean for tenant baseline
async function computeVelocitySignal(
    tenantId: string,
    userId: string,
    thirtyDaysAgo: Date,
    checklistDomainScore: number,
    reworkDomainScore: number
) {
    // User's forward transitions: compute days between enteredStageAt and transition timestamp
    const userTransitions = await prisma.historyItem.findMany({
        where: {
            tenantId,
            performedByUserId: userId,
            revertReasonCategory: null, // Forward only
            timestamp: { gte: thirtyDaysAgo }
        },
        select: { timestamp: true, projectId: true, stage: true }
    });

    if (userTransitions.length === 0) {
        return { velocityDomainScore: 0, avgStageDays: 0, tenantAvgStageDays: 0 };
    }

    // For each transition, compute days the project was in the stage
    const userStageDurations: number[] = [];
    for (const t of userTransitions) {
        // Find when this stage was entered (previous transition on the same project to this stage)
        const stageEntry = await prisma.historyItem.findFirst({
            where: {
                projectId: t.projectId,
                tenantId,
                toStage: t.stage,
                timestamp: { lt: t.timestamp }
            },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true }
        });

        if (stageEntry) {
            const days = (t.timestamp.getTime() - stageEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
            if (days > 0) userStageDurations.push(days);
        }
    }

    if (userStageDurations.length === 0) {
        return { velocityDomainScore: 0, avgStageDays: 0, tenantAvgStageDays: 0 };
    }

    const userAvg = userStageDurations.reduce((a, b) => a + b, 0) / userStageDurations.length;

    // Tenant baseline: MEDIAN of all forward transition durations in last 30 days
    const allTenantTransitions = await prisma.historyItem.findMany({
        where: {
            tenantId,
            revertReasonCategory: null,
            timestamp: { gte: thirtyDaysAgo }
        },
        select: { timestamp: true, projectId: true, stage: true }
    });

    const tenantDurations: number[] = [];
    for (const t of allTenantTransitions) {
        const stageEntry = await prisma.historyItem.findFirst({
            where: {
                projectId: t.projectId,
                tenantId,
                toStage: t.stage,
                timestamp: { lt: t.timestamp }
            },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true }
        });
        if (stageEntry) {
            const days = (t.timestamp.getTime() - stageEntry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
            if (days > 0) tenantDurations.push(days);
        }
    }

    // MEDIAN calculation (not mean) — protects against outlier distortion
    tenantDurations.sort((a, b) => a - b);
    const tenantMedian = tenantDurations.length > 0
        ? tenantDurations.length % 2 === 0
            ? (tenantDurations[tenantDurations.length / 2 - 1] + tenantDurations[tenantDurations.length / 2]) / 2
            : tenantDurations[Math.floor(tenantDurations.length / 2)]
        : userAvg; // if no tenant data, user is the baseline

    const deviationPct = tenantMedian > 0 ? ((userAvg - tenantMedian) / tenantMedian) : 0;

    let domainScore = 0;
    if (deviationPct <= -0.10) {
        // Faster — but apply guardrail
        if (checklistDomainScore >= 0.5 && reworkDomainScore >= 0) {
            domainScore = 0.5; // Genuinely fast with clean discipline
        } else {
            domainScore = 0; // Fast but sloppy — no reward
        }
    } else if (Math.abs(deviationPct) <= 0.10) {
        domainScore = 1.0; // Within ±10% of median — optimal
    } else if (deviationPct <= 0.25) {
        domainScore = 0; // 10–25% slower
    } else {
        domainScore = -1.0; // >25% slower
    }

    return {
        velocityDomainScore: clamp(domainScore),
        avgStageDays: userAvg,
        tenantAvgStageDays: tenantMedian
    };
}

// =============================================
// MAIN COMPUTATION ORCHESTRATOR
// =============================================
export async function computeUserDiscipline(tenantId: string, userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get user role
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    });

    if (!user) throw new Error(`User ${userId} not found`);

    const userRole = user.role;

    // Compute all 5 signals
    const qaResult = await computeQaSignal(tenantId, userId, userRole, thirtyDaysAgo);
    const reworkResult = await computeReworkSignal(tenantId, userId, thirtyDaysAgo);
    const checklistResult = await computeChecklistSignal(tenantId, userId, thirtyDaysAgo);
    const deadlineResult = await computeDeadlineSignal(tenantId, userId, userRole, thirtyDaysAgo);
    const velocityResult = await computeVelocitySignal(
        tenantId, userId, thirtyDaysAgo,
        checklistResult.checklistDomainScore,
        reworkResult.reworkDomainScore
    );

    // Normalize: average of clamped domain scores, then map to 0–100
    const rawIndex = (
        qaResult.qaDomainScore +
        reworkResult.reworkDomainScore +
        checklistResult.checklistDomainScore +
        deadlineResult.deadlineDomainScore +
        velocityResult.velocityDomainScore
    ) / 5;

    // Post-average hard clamp
    const clampedRawIndex = clamp(rawIndex);
    const disciplineIndex = 50 + (clampedRawIndex * 50);

    return {
        disciplineIndex,
        ...qaResult,
        ...reworkResult,
        ...checklistResult,
        ...deadlineResult,
        ...velocityResult
    };
}

// =============================================
// SNAPSHOT WRITER
// =============================================
export async function createDisciplineSnapshot(tenantId: string, userId: string) {
    const result = await computeUserDiscipline(tenantId, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await prisma.disciplineSnapshot.upsert({
        where: {
            tenantId_userId_snapshotDate: {
                tenantId,
                userId,
                snapshotDate: today
            }
        },
        update: {
            disciplineIndex: result.disciplineIndex,
            qaDomainScore: result.qaDomainScore,
            reworkDomainScore: result.reworkDomainScore,
            checklistDomainScore: result.checklistDomainScore,
            deadlineDomainScore: result.deadlineDomainScore,
            velocityDomainScore: result.velocityDomainScore,
            qaFirstPassCount: result.qaFirstPassCount,
            qaRejectCount: result.qaRejectCount,
            revertCount: result.revertCount,
            highSevRevertCount: result.highSevRevertCount,
            checklistAvgRate: result.checklistAvgRate,
            onTimeRate: result.onTimeRate,
            avgDelayDays: result.avgDelayDays,
            avgStageDays: result.avgStageDays,
            tenantAvgStageDays: result.tenantAvgStageDays,
            tenantAvgReverts: result.tenantAvgReverts
        },
        create: {
            tenantId,
            userId,
            snapshotDate: today,
            disciplineIndex: result.disciplineIndex,
            qaDomainScore: result.qaDomainScore,
            reworkDomainScore: result.reworkDomainScore,
            checklistDomainScore: result.checklistDomainScore,
            deadlineDomainScore: result.deadlineDomainScore,
            velocityDomainScore: result.velocityDomainScore,
            qaFirstPassCount: result.qaFirstPassCount,
            qaRejectCount: result.qaRejectCount,
            revertCount: result.revertCount,
            highSevRevertCount: result.highSevRevertCount,
            checklistAvgRate: result.checklistAvgRate,
            onTimeRate: result.onTimeRate,
            avgDelayDays: result.avgDelayDays,
            avgStageDays: result.avgStageDays,
            tenantAvgStageDays: result.tenantAvgStageDays,
            tenantAvgReverts: result.tenantAvgReverts
        }
    });
}

// =============================================
// QUERY HELPERS (for API endpoints)
// =============================================
export async function getLatestSnapshot(tenantId: string, userId: string) {
    return await prisma.disciplineSnapshot.findFirst({
        where: { tenantId, userId },
        orderBy: { snapshotDate: 'desc' }
    });
}

export async function getLatestTwoSnapshots(tenantId: string, userId: string) {
    return await prisma.disciplineSnapshot.findMany({
        where: { tenantId, userId },
        orderBy: { snapshotDate: 'desc' },
        take: 2
    });
}

export async function getTeamSnapshots(tenantId: string) {
    // Get latest snapshot per user
    const users = await prisma.user.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, role: true, avatar: true }
    });

    const snapshots = await Promise.all(
        users.map(async (user) => {
            const latest = await getLatestSnapshot(tenantId, user.id);
            return { user, snapshot: latest };
        })
    );

    return snapshots;
}
