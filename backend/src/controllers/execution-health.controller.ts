import { Request, Response, NextFunction } from 'express';
import { computeExecutionHealth } from '../services/execution-health.service';
import { getCachedHealth, setCachedHealth } from '../services/health-cache';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';

// GET /api/projects/:id/execution-health
// Access: Admin + assigned leads only
export const getExecutionHealth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!tenantId || !userId) {
            throw AppError.unauthorized('Unauthorized', 'NO_TENANT');
        }

        const { id } = req.params;

        // Verify project exists and belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId },
            select: {
                id: true,
                assignedDesignerId: true,
                assignedDevManagerId: true,
                assignedQAId: true,
            }
        });

        if (!project) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        // Access control: Admin or assigned leads only
        if (userRole !== 'ADMIN') {
            const isAssigned =
                project.assignedDesignerId === userId ||
                project.assignedDevManagerId === userId ||
                project.assignedQAId === userId;

            if (!isAssigned) {
                throw AppError.forbidden('You do not have access to this project\'s execution health', 'NOT_AUTHORIZED');
            }
        }

        // Read-through cache (60s TTL)
        const cached = getCachedHealth(id);
        if (cached) {
            return res.json(cached);
        }

        const health = await computeExecutionHealth(id);
        setCachedHealth(id, health);
        res.json(health);
    } catch (error) {
        next(error);
    }
};
