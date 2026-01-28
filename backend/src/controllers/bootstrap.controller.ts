import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getBootstrapData = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;

        // CRITICAL: Fail-fast if tenant context is missing
        // NEVER fallback to fetching all data - this would leak data across tenants
        if (!tenantId) {
            return res.status(401).json({
                error: 'Unauthorized: Tenant context required'
            });
        }

        const [users, projects] = await Promise.all([
            prisma.user.findMany({
                where: { tenantId },
                select: { // Exclude password
                    id: true, name: true, email: true, role: true, avatar: true, tenantId: true
                }
            }),
            prisma.project.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                include: {
                    comments: true,
                    history: true,
                    assignedDesigner: true,
                    assignedDevManager: true,
                    assignedQA: true
                },
                take: 10 // Limit initial projects to 10 for speed
            })
        ]);

        res.json({
            users,
            projects
        });

    } catch (error) {
        console.error('Bootstrap error:', error);
        res.status(500).json({ error: 'Failed to load initial data' });
    }
};
