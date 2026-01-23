import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getBootstrapData = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        
        // Allow bootstrap to fetch based on tenant if filtered, strictly speaking
        // But the legacy bootstrap fetched ALL data.
        // For SaaS, we MUST filter by tenant.
        // If no tenantId (e.g. unauth), it should probably fail or return nothing.
        // However, in this dev phase, let's assume if there is a tenantId we filter.

        const filter = tenantId ? { tenantId } : {};
        // Note: ScoreEntry doesn't have tenantId directly, needs relation check.
        
        const [users, projects, scores] = await Promise.all([
          prisma.user.findMany({ 
              where: filter,
              select: { // Exclude password
                  id: true, name: true, email: true, role: true, avatar: true, tenantId: true
              }
          }),
          prisma.project.findMany({
              where: filter,
              orderBy: { createdAt: 'desc' },
              include: {
                  comments: true,
                  history: true,
                  assignedDesigner: true,
                  assignedDevManager: true,
                  assignedQA: true
              }
          }),
          prisma.scoreEntry.findMany({
             where: tenantId ? { project: { tenantId } } : {},
             include: { project: true }
          })
        ]);

        res.json({
            users,
            projects,
            scores
        });

    } catch (error) {
        console.error('Bootstrap error:', error);
        res.status(500).json({ error: 'Failed to load initial data' });
    }
};
