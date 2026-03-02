import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';

const VALID_OUTCOMES = ['ON_TIME', 'DELAYED', 'ESCALATED'];

// GET /api/calibration — Admin-only calibration report
export const getCalibrationReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

        const completedProjects = await prisma.project.findMany({
            where: {
                tenantId,
                stage: 'COMPLETED',
                completedAt: { not: null },
            },
            select: {
                id: true,
                name: true,
                clientName: true,
                completedAt: true,
                overallDeadline: true,
                healthAtCompletion: true,
                actualOutcome: true,
                assignedDevManager: { select: { id: true, name: true } },
            },
            orderBy: { completedAt: 'desc' },
            take: 100, // Last 100 completed projects
        });

        // Compute accuracy stats
        const withBothFields = completedProjects.filter(
            p => p.healthAtCompletion !== null && p.actualOutcome !== null
        );

        let correctPredictions = 0;
        for (const p of withBothFields) {
            const predicted = p.healthAtCompletion! >= 60 ? 'AT_RISK' : p.healthAtCompletion! >= 40 ? 'WATCH' : 'STABLE';
            const wasProblematic = p.actualOutcome !== 'ON_TIME';

            // A prediction is "correct" if:
            // AT_RISK/WATCH → DELAYED/ESCALATED, or STABLE → ON_TIME
            if ((predicted !== 'STABLE' && wasProblematic) || (predicted === 'STABLE' && !wasProblematic)) {
                correctPredictions++;
            }
        }

        const accuracy = withBothFields.length > 0
            ? Math.round((correctPredictions / withBothFields.length) * 100)
            : null;

        res.json({
            projects: completedProjects,
            stats: {
                totalCompleted: completedProjects.length,
                withHealthData: completedProjects.filter(p => p.healthAtCompletion !== null).length,
                withOutcome: completedProjects.filter(p => p.actualOutcome !== null).length,
                calibrated: withBothFields.length,
                accuracy,
            }
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/calibration/:projectId/outcome — Admin tags actual outcome
export const setActualOutcome = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

        const { projectId } = req.params;
        const { actualOutcome } = req.body;

        if (!actualOutcome || !VALID_OUTCOMES.includes(actualOutcome)) {
            throw AppError.badRequest(
                `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}`,
                'INVALID_OUTCOME'
            );
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, tenantId, stage: 'COMPLETED' }
        });

        if (!project) {
            throw AppError.notFound('Completed project not found', 'PROJECT_NOT_FOUND');
        }

        await prisma.project.update({
            where: { id: projectId },
            data: { actualOutcome }
        });

        res.json({ success: true, projectId, actualOutcome });
    } catch (error) {
        next(error);
    }
};
