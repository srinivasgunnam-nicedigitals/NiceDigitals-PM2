import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';

/**
 * GET /api/activity
 * Returns a globally scoped, chronologically sorted activity feed for the
 * current tenant, derived from the HistoryItem table.
 * This is the canonical source for the Activity Feed page — it queries
 * across ALL projects (not paginated project snapshots) and returns up to
 * the last 100 events.
 */
export const getActivityFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

        const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);

        const items = await prisma.historyItem.findMany({
            where: { tenantId },
            orderBy: { timestamp: 'desc' },
            take: limit,
            select: {
                id: true,
                stage: true,
                action: true,
                timestamp: true,
                userId: true,
                projectId: true,
            }
        });

        // Enrich with project names in a single bulk fetch
        const projectIds = [...new Set(items.map(i => i.projectId).filter(Boolean))] as string[];
        const projects = await prisma.project.findMany({
            where: { id: { in: projectIds }, tenantId },
            select: { id: true, name: true }
        });
        const projectMap = new Map(projects.map(p => [p.id, p.name]));

        const enriched = items.map(item => ({
            ...item,
            projectName: item.projectId ? (projectMap.get(item.projectId) ?? 'Unknown Project') : 'System',
        }));

        res.json(enriched);
    } catch (error) {
        next(error);
    }
};
