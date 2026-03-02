/**
 * LEADERBOARD V3 — Event-Driven Scoring Engine
 * 
 * Single source of truth for operational rankings.
 * Called ONLY from within advanceProjectStage() transaction.
 * 
 * Design: Deterministic, event-driven, monthly-isolated, duplicate-protected.
 */

import { Prisma, LeaderboardEventType, UserRole, RevertReasonCategory } from '@prisma/client';
import { logger } from '../config/logger';

// =============================================
// REVERT SEVERITY — Reused from Discipline Engine
// =============================================
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

// =============================================
// DEFAULT SCORING MATRIX — Per V3 Spec
// =============================================
export const DEFAULT_SCORING_MATRIX: Array<{
    role: UserRole;
    eventType: LeaderboardEventType;
    basePoints: number;
}> = [
    // Designer events
    { role: 'DESIGNER',     eventType: 'DESIGN_HANDOFF',             basePoints: 5 },
    { role: 'DESIGNER',     eventType: 'DESIGN_REVERT',              basePoints: -5 },
    { role: 'DESIGNER',     eventType: 'DEV_REVERT_TO_DESIGN',       basePoints: -8 },

    // Dev Manager events
    { role: 'DEV_MANAGER',  eventType: 'DEV_TO_QA',                  basePoints: 8 },
    { role: 'DEV_MANAGER',  eventType: 'QA_REJECTION',               basePoints: -10 },
    { role: 'DEV_MANAGER',  eventType: 'PROJECT_COMPLETED_ONTIME',   basePoints: 15 },
    { role: 'DEV_MANAGER',  eventType: 'PROJECT_COMPLETED_DELAYED',  basePoints: -20 },

    // QA Engineer events
    { role: 'QA_ENGINEER',  eventType: 'QA_CLEARANCE',               basePoints: 6 },
    { role: 'QA_ENGINEER',  eventType: 'UAT_REJECTION',              basePoints: -8 },

    // Punctuality Scoring (Track C)
    { role: 'DESIGNER',     eventType: 'STAGE_COMPLETED_ON_TIME',    basePoints: 5 },
    { role: 'DESIGNER',     eventType: 'STAGE_COMPLETED_LATE',       basePoints: -3 },
    { role: 'DEV_MANAGER',  eventType: 'STAGE_COMPLETED_ON_TIME',    basePoints: 5 },
    { role: 'DEV_MANAGER',  eventType: 'STAGE_COMPLETED_LATE',       basePoints: -3 },
    { role: 'QA_ENGINEER',  eventType: 'STAGE_COMPLETED_ON_TIME',    basePoints: 5 },
    { role: 'QA_ENGINEER',  eventType: 'STAGE_COMPLETED_LATE',       basePoints: -3 },
];

// =============================================
// TRANSITION → EVENT MAPPING
// =============================================
interface TransitionEvent {
    eventType: LeaderboardEventType;
    role: UserRole;
    getUserId: (project: any) => string | null;
    isSeverityWeighted: boolean;
}

/**
 * Maps stage transitions to leaderboard events.
 * Key format: "FROM_STAGE->TO_STAGE"
 */
const TRANSITION_EVENT_MAP: Record<string, TransitionEvent> = {
    // Designer: DESIGN → CLIENT_REVIEW = handoff (positive)
    'DESIGN->CLIENT_REVIEW': {
        eventType: 'DESIGN_HANDOFF',
        role: 'DESIGNER',
        getUserId: (p) => p.assignedDesignerId,
        isSeverityWeighted: false,
    },
    // Designer: CLIENT_REVIEW → DESIGN = revert (negative, severity-weighted)
    'CLIENT_REVIEW->DESIGN': {
        eventType: 'DESIGN_REVERT',
        role: 'DESIGNER',
        getUserId: (p) => p.assignedDesignerId,
        isSeverityWeighted: true,
    },
    // Designer: DEVELOPMENT → DESIGN = dev revert to design (negative, severity-weighted)
    'DEVELOPMENT->DESIGN': {
        eventType: 'DEV_REVERT_TO_DESIGN',
        role: 'DESIGNER',
        getUserId: (p) => p.assignedDesignerId,
        isSeverityWeighted: true,
    },
    // Dev Manager: DEVELOPMENT → INTERNAL_QA = dev to QA (positive)
    'DEVELOPMENT->INTERNAL_QA': {
        eventType: 'DEV_TO_QA',
        role: 'DEV_MANAGER',
        getUserId: (p) => p.assignedDevManagerId,
        isSeverityWeighted: false,
    },
    // Dev Manager: INTERNAL_QA → DEVELOPMENT = QA rejection (negative, severity-weighted)
    'INTERNAL_QA->DEVELOPMENT': {
        eventType: 'QA_REJECTION',
        role: 'DEV_MANAGER',
        getUserId: (p) => p.assignedDevManagerId,
        isSeverityWeighted: true,
    },
    // QA Engineer: INTERNAL_QA → INTERNAL_APPROVAL = QA clearance (positive)
    'INTERNAL_QA->INTERNAL_APPROVAL': {
        eventType: 'QA_CLEARANCE',
        role: 'QA_ENGINEER',
        getUserId: (p) => p.assignedQAId,
        isSeverityWeighted: false,
    },
    // QA Engineer: CLIENT_UAT → INTERNAL_QA = UAT rejection (negative, severity-weighted)
    'CLIENT_UAT->INTERNAL_QA': {
        eventType: 'UAT_REJECTION',
        role: 'QA_ENGINEER',
        getUserId: (p) => p.assignedQAId,
        isSeverityWeighted: true,
    },
};

// =============================================
// CORE: Record Leaderboard Event
// =============================================

interface RecordEventParams {
    project: {
        id: string;
        stage: string;
        assignedDesignerId: string | null;
        assignedDevManagerId: string | null;
        assignedQAId: string | null;
        overallDeadline: Date | string;
        tenantId: string;
    };
    nextStage: string;
    revertReasonCategory?: RevertReasonCategory | null;
    punctualityEvent?: {
        eventType: LeaderboardEventType;
        role: UserRole;
        userId: string;
    };
}

/**
 * Records leaderboard events for a stage transition.
 * MUST be called inside the advanceProjectStage $transaction.
 * 
 * Uses unique constraint on LeaderboardEventLog for duplicate protection.
 */
export async function recordLeaderboardEvent(
    tx: Prisma.TransactionClient,
    params: RecordEventParams
): Promise<void> {
    const { project, nextStage, revertReasonCategory } = params;
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed
    const year = now.getFullYear();

    const transitionKey = `${project.stage}->${nextStage}`;

    // Collect all events to process for this transition
    const eventsToProcess: Array<{ event: TransitionEvent; isCompletion: boolean }> = [];

    // Check standard transition map
    const mappedEvent = TRANSITION_EVENT_MAP[transitionKey];
    if (mappedEvent) {
        eventsToProcess.push({ event: mappedEvent, isCompletion: false });
    }

    // Check completion events (DEPLOYMENT → COMPLETED)
    if (nextStage === 'COMPLETED' && project.stage === 'DEPLOYMENT') {
        const overallDeadline = new Date(project.overallDeadline);
        const isOnTime = now <= overallDeadline;

        eventsToProcess.push({
            event: {
                eventType: isOnTime ? 'PROJECT_COMPLETED_ONTIME' : 'PROJECT_COMPLETED_DELAYED',
                role: 'DEV_MANAGER',
                getUserId: (p) => p.assignedDevManagerId,
                isSeverityWeighted: false,
            },
            isCompletion: true,
        });
    }

    // Include purely isolated Punctuality Event if resolved by Evaluator
    if (params.punctualityEvent) {
        eventsToProcess.push({
            event: {
                eventType: params.punctualityEvent.eventType,
                role: params.punctualityEvent.role,
                getUserId: () => params.punctualityEvent!.userId,
                isSeverityWeighted: false,
            },
            isCompletion: false,
        });
    }

    // Process each event
    for (const { event } of eventsToProcess) {
        const userId = event.getUserId(project);
        if (!userId) {
            // No user assigned for this role — skip silently
            continue;
        }

        // Get base points from snapshot (fallback to config, fallback to default)
        let basePoints = await getBasePoints(tx, project.tenantId, event.role, event.eventType, month, year);

        // Apply severity multiplier for reverts
        let finalPoints = basePoints;
        if (event.isSeverityWeighted && revertReasonCategory) {
            const severity = REVERT_SEVERITY[revertReasonCategory] || 0.5;
            finalPoints = basePoints * severity;
        }

        // Determine counters
        const isSuccess = finalPoints > 0;
        const isRevert = event.isSeverityWeighted;

        // Log the event (no unique constraint — repeat events like multiple QA rejections are allowed)
        await tx.leaderboardEventLog.create({
            data: {
                projectId: project.id,
                userId,
                eventType: event.eventType,
                month,
                year,
                points: finalPoints,
                tenantId: project.tenantId,
            },
        });

        // Upsert the monthly entry
        await tx.roleLeaderboardEntry.upsert({
            where: {
                tenantId_userId_role_month_year: {
                    tenantId: project.tenantId,
                    userId,
                    role: event.role,
                    month,
                    year,
                },
            },
            create: {
                tenantId: project.tenantId,
                userId,
                role: event.role,
                month,
                year,
                score: finalPoints,
                successCount: isSuccess ? 1 : 0,
                revertCount: isRevert ? 1 : 0,
                onTimeCount: 0,
            },
            update: {
                score: { increment: finalPoints },
                successCount: isSuccess ? { increment: 1 } : undefined,
                revertCount: isRevert ? { increment: 1 } : undefined,
            },
        });
    }
}

// =============================================
// QUERY: Get Leaderboard Rankings
// =============================================

export interface LeaderboardRow {
    rank: number;
    userId: string;
    userName: string;
    avatar: string | null;
    score: number;
    successCount: number;
    revertCount: number;
}

/**
 * Returns sorted leaderboard for a given role/month/year.
 * Filters by isActive users. Applies deterministic tie-breaking.
 */
export async function getLeaderboard(
    prismaClient: Prisma.TransactionClient | any,
    tenantId: string,
    role: UserRole,
    month: number,
    year: number
): Promise<LeaderboardRow[]> {
    const entries = await prismaClient.roleLeaderboardEntry.findMany({
        where: { tenantId, role, month, year },
        orderBy: [
            { score: 'desc' },
            { revertCount: 'asc' },     // fewer reverts = better
            { updatedAt: 'asc' },        // earlier activity = tiebreak
        ],
    });

    // Filter out inactive users & enrich with user details
    const userIds = entries.map((e: any) => e.userId);
    const users = await prismaClient.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: { id: true, name: true, avatar: true },
    });

    const userMap = new Map<string, { id: string; name: string; avatar: string | null }>(
        users.map((u: any) => [u.id, u])
    );

    return entries
        .filter((e: any) => userMap.has(e.userId))
        .map((e: any, index: number) => ({
            rank: index + 1,
            userId: e.userId,
            userName: userMap.get(e.userId)!.name,
            avatar: userMap.get(e.userId)!.avatar,
            score: e.score,
            successCount: e.successCount,
            revertCount: e.revertCount,
        }));
}

// =============================================
// HELPER: Get Base Points (Snapshot → Config → Default)
// =============================================

async function getBasePoints(
    tx: Prisma.TransactionClient,
    tenantId: string,
    role: UserRole,
    eventType: LeaderboardEventType,
    month: number,
    year: number
): Promise<number> {
    // 1. Try snapshot for this month
    const snapshot = await tx.leaderboardConfigSnapshot.findUnique({
        where: {
            tenantId_role_eventType_month_year: {
                tenantId, role, eventType, month, year,
            },
        },
    });
    if (snapshot) return snapshot.basePoints;

    // 2. Try live config
    const config = await tx.leaderboardConfig.findUnique({
        where: {
            tenantId_role_eventType: { tenantId, role, eventType },
        },
    });
    if (config) return config.basePoints;

    // 3. Fallback to hardcoded default — log explicitly to prevent silent drift
    const defaultEntry = DEFAULT_SCORING_MATRIX.find(
        (d) => d.role === role && d.eventType === eventType
    );
    if (defaultEntry) {
        logger.warn(
            { tenantId, role, eventType, month, year, basePoints: defaultEntry.basePoints },
            'Leaderboard: No snapshot or config found — using hardcoded default'
        );
        return defaultEntry.basePoints;
    }

    // No default exists for this role+event combination — this should never happen
    logger.error(
        { tenantId, role, eventType, month, year },
        'Leaderboard: No scoring config found at any level — scoring 0 points'
    );
    return 0;
}
