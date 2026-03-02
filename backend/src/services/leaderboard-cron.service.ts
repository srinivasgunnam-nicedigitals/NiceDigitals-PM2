/**
 * LEADERBOARD V3 — Monthly Config Snapshot Cron
 * 
 * Runs on the 1st of every month at 00:00 server time.
 * Copies current LeaderboardConfig → LeaderboardConfigSnapshot for the new month.
 * Falls back to DEFAULT_SCORING_MATRIX if tenant has no config rows.
 * 
 * Includes retry logic with exponential backoff.
 */

import * as cron from 'node-cron';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { DEFAULT_SCORING_MATRIX } from './leaderboard.service';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function snapshotLeaderboardConfig(): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    logger.info({ month, year }, 'Leaderboard cron: Starting monthly config snapshot');

    try {
        // Get all tenants
        const tenants = await prisma.tenant.findMany({ select: { id: true } });

        for (const tenant of tenants) {
            // Get tenant-specific config
            const configs = await prisma.leaderboardConfig.findMany({
                where: { tenantId: tenant.id },
            });

            // Determine scoring entries: use tenant config if exists, else defaults
            const entries = configs.length > 0
                ? configs.map((c) => ({
                    tenantId: tenant.id,
                    role: c.role,
                    eventType: c.eventType,
                    basePoints: c.basePoints,
                    month,
                    year,
                }))
                : DEFAULT_SCORING_MATRIX.map((d) => ({
                    tenantId: tenant.id,
                    role: d.role,
                    eventType: d.eventType,
                    basePoints: d.basePoints,
                    month,
                    year,
                }));

            // Upsert each snapshot row (idempotent — safe to re-run)
            for (const entry of entries) {
                await prisma.leaderboardConfigSnapshot.upsert({
                    where: {
                        tenantId_role_eventType_month_year: {
                            tenantId: entry.tenantId,
                            role: entry.role,
                            eventType: entry.eventType,
                            month: entry.month,
                            year: entry.year,
                        },
                    },
                    create: entry,
                    update: { basePoints: entry.basePoints },
                });
            }

            logger.info({ tenantId: tenant.id, entries: entries.length, month, year }, 'Leaderboard cron: Snapshot complete for tenant');
        }
    } catch (error) {
        logger.error({ error, month, year }, 'Leaderboard cron: Snapshot FAILED');
        throw error;
    }
}

async function runWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await snapshotLeaderboardConfig();
            return;
        } catch (error) {
            logger.warn({ attempt, maxRetries: MAX_RETRIES }, 'Leaderboard cron: Retry after failure');
            if (attempt < MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            } else {
                logger.error({ error }, 'Leaderboard cron: All retries exhausted. Manual intervention required.');
            }
        }
    }
}

/**
 * Start the leaderboard cron job.
 * Schedule: 1st of every month at 00:00.
 */
export function startLeaderboardCron(): void {
    // Run at midnight on the 1st of every month
    cron.schedule('0 0 1 * *', () => {
        runWithRetry();
    });
    logger.info('Leaderboard cron: Scheduled monthly config snapshot (1st @ 00:00)');
}
