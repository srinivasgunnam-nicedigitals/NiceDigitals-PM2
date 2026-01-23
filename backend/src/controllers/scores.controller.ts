import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getScores = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        const scores = await prisma.scoreEntry.findMany({
            where: {
                project: {
                    tenantId: tenantId
                }
            },
            include: {
                project: true // Optional: Include project details if needed, or remove if too heavy
            }
        });

        res.json(scores);
    } catch (error) {
        console.error('Get scores error:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
};

/**
 * DEPRECATED: This endpoint has been removed for security reasons.
 * Scores are now ONLY created by backend service layer during project lifecycle events.
 * 
 * Previously, this endpoint accepted client-provided 'points' which allowed
 * any authenticated user to award themselves arbitrary scores.
 * 
 * Scores are now automatically calculated and recorded when:
 * - Projects are completed (via /api/projects/:id/advance-stage)
 * - QA feedback is recorded (via /api/projects/:id/qa-feedback)
 */
export const addScore = async (req: Request, res: Response) => {
    return res.status(403).json({
        error: 'Direct score creation is not allowed. Scores are automatically calculated by the system during project events.',
        hint: 'Use /api/projects/:id/advance-stage or /api/projects/:id/qa-feedback instead'
    });
};
