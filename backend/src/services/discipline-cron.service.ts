import cron from 'node-cron';
import { prisma } from '../config/db';
import { createDisciplineSnapshot } from './discipline.service';

// =============================================
// DAILY DISCIPLINE CRON — 02:00 AM
// =============================================
// Iterates all tenants → all active users → computes snapshot
// Append-only: never mutates old snapshots

let isRunning = false;

export function startDisciplineCron() {
    // Schedule: every day at 02:00 AM server time
    cron.schedule('0 2 * * *', async () => {
        if (isRunning) {
            console.warn('[DisciplineCron] Previous run still active. Skipping.');
            return;
        }
        isRunning = true;
        console.log('[DisciplineCron] Starting daily discipline computation...');
        
        try {
            const tenants = await prisma.tenant.findMany({
                select: { id: true, name: true }
            });

            let totalUsers = 0;
            let totalErrors = 0;

            for (const tenant of tenants) {
                const users = await prisma.user.findMany({
                    where: { tenantId: tenant.id, isActive: true },
                    select: { id: true, name: true }
                });

                for (const user of users) {
                    try {
                        await createDisciplineSnapshot(tenant.id, user.id);
                        totalUsers++;
                    } catch (err) {
                        totalErrors++;
                        console.error(`[DisciplineCron] Error computing snapshot for user ${user.id} (${user.name}) in tenant ${tenant.name}:`, err);
                    }
                }
            }

            console.log(`[DisciplineCron] Completed. ${totalUsers} snapshots created. ${totalErrors} errors.`);
        } catch (err) {
            console.error('[DisciplineCron] Fatal error during cron execution:', err);
        } finally {
            isRunning = false;
        }
    });

    console.log('[DisciplineCron] Scheduled daily at 02:00 AM');
}

// Manual trigger for testing / debugging
export async function triggerDisciplineComputation() {
    console.log('[DisciplineCron] Manual trigger initiated...');
    
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });

    const results: Array<{ tenantName: string; userId: string; userName: string; disciplineIndex: number }> = [];

    for (const tenant of tenants) {
        const users = await prisma.user.findMany({
            where: { tenantId: tenant.id, isActive: true },
            select: { id: true, name: true }
        });

        for (const user of users) {
            try {
                const snapshot = await createDisciplineSnapshot(tenant.id, user.id);
                results.push({
                    tenantName: tenant.name,
                    userId: user.id,
                    userName: user.name,
                    disciplineIndex: snapshot.disciplineIndex
                });
            } catch (err) {
                console.error(`[ManualTrigger] Error for user ${user.id}:`, err);
            }
        }
    }

    console.log(`[DisciplineCron] Manual trigger completed. ${results.length} snapshots created.`);
    return results;
}
