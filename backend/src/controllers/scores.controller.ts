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

export const addScore = async (req: Request, res: Response) => {
    try {
        const { projectId, userId, points, reason, date } = req.body;
        const tenantId = req.user?.tenantId;
        
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        // Verify project existence and tenant ownership
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                tenantId: tenantId
            }
        });

        if (!project) {
            return res.status(403).json({ error: 'Project access denied' });
        }

        const newScore = await prisma.scoreEntry.create({
            data: {
                id: `s-${Date.now()}-${Math.random()}`,
                projectId,
                userId,
                points,
                reason,
                date,
                tenantId: tenantId
            }
        });

        res.json(newScore);
    } catch (error) {
        console.error('Add score error:', error);
        res.status(500).json({ error: 'Failed to record score' });
    }
};
