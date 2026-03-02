import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { updateSchedulingConfigSchema } from '../utils/validation';

export const getSchedulingConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.params;
        const userTenantId = req.user?.tenantId;
        const userRole = req.user?.role;

        // Security assertion (should be caught by middleware normally but we double guard)
        if (tenantId !== userTenantId || userRole !== 'ADMIN') {
            throw AppError.forbidden('Only admins can access tenant scheduling config', 'UNAUTHORIZED_CONFIG_ACCESS');
        }

        // Transaction for idempotent creation
        const config = await prisma.$transaction(async (tx) => {
            const existing = await tx.stageSchedulingConfig.findUnique({
                where: { tenantId }
            });
            if (existing) return existing;

            // Default safe template
            return tx.stageSchedulingConfig.create({
                data: {
                    tenantId,
                    designRatio: 20,
                    developmentRatio: 40,
                    qaRatio: 25,
                    approvalRatio: 15,
                    overlapPercent: 10,
                    autoAllocate: true
                }
            });
        });

        res.json(config);
    } catch (error) {
        next(error);
    }
};

export const updateSchedulingConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.params;
        const userTenantId = req.user?.tenantId;
        const userRole = req.user?.role;

        if (tenantId !== userTenantId || userRole !== 'ADMIN') {
            throw AppError.forbidden('Only admins can update tenant scheduling config', 'UNAUTHORIZED_CONFIG_UPDATE');
        }

        // 1. Zod basic shape validation (strips unknown)
        const parsed = updateSchedulingConfigSchema.parse(req.body);

        // 2. Strict math validation (Custom error matching Phase 3A Spec exactly)
        const sum = parsed.designRatio + parsed.developmentRatio + parsed.qaRatio + parsed.approvalRatio;
        if (sum !== 100 || parsed.overlapPercent < 0 || parsed.overlapPercent > 50) {
            throw AppError.badRequest(
                'Ratios must sum to 100 and overlap must be between 0 and 50.',
                'INVALID_RATIO_CONFIGURATION'
            );
        }

        // 3. Apply update (Idempotent upsert just in case GET was never called)
        const updatedConfig = await prisma.stageSchedulingConfig.upsert({
            where: { tenantId },
            update: {
                designRatio: parsed.designRatio,
                developmentRatio: parsed.developmentRatio,
                qaRatio: parsed.qaRatio,
                approvalRatio: parsed.approvalRatio,
                overlapPercent: parsed.overlapPercent,
                autoAllocate: parsed.autoAllocate
            },
            create: {
                tenantId,
                designRatio: parsed.designRatio,
                developmentRatio: parsed.developmentRatio,
                qaRatio: parsed.qaRatio,
                approvalRatio: parsed.approvalRatio,
                overlapPercent: parsed.overlapPercent,
                autoAllocate: parsed.autoAllocate
            }
        });

        res.json(updatedConfig);
    } catch (error) {
        next(error);
    }
};
