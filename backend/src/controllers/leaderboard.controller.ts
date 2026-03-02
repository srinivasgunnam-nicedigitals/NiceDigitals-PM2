/**
 * LEADERBOARD V3 — Controller
 * 
 * GET /api/leaderboard/:role   — Returns monthly rankings for a role
 * 
 * Query params: month, year (optional, defaults to current)
 * Admin-only: month/year filtering for historical access
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { getLeaderboard } from '../services/leaderboard.service';
import { UserRole } from '@prisma/client';

const VALID_ROLES: Record<string, UserRole> = {
    designer: 'DESIGNER',
    dev: 'DEV_MANAGER',
    qa: 'QA_ENGINEER',
};

export const getLeaderboardByRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

        const roleParam = req.params.role?.toLowerCase();
        const role = VALID_ROLES[roleParam];
        if (!role) {
            throw AppError.badRequest(
                `Invalid role. Must be one of: ${Object.keys(VALID_ROLES).join(', ')}`,
                'INVALID_ROLE'
            );
        }

        // Month/Year: Default to current. Only Admin can query historical months.
        const now = new Date();
        let month = now.getMonth() + 1;
        let year = now.getFullYear();

        if (req.query.month || req.query.year) {
            if (req.user?.role !== 'ADMIN') {
                throw AppError.forbidden('Only admins can view historical leaderboards', 'ADMIN_ONLY');
            }
            month = parseInt(req.query.month as string) || month;
            year = parseInt(req.query.year as string) || year;

            // Basic validation
            if (month < 1 || month > 12) throw AppError.badRequest('Month must be 1-12', 'INVALID_MONTH');
            if (year < 2020 || year > 2100) throw AppError.badRequest('Year must be 2020-2100', 'INVALID_YEAR');
        }

        const leaderboard = await getLeaderboard(prisma, tenantId, role, month, year);

        res.json({
            role,
            month,
            year,
            entries: leaderboard,
        });
    } catch (error) {
        next(error);
    }
};
