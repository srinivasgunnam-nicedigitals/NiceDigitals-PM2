import cron from 'node-cron';
import { prisma } from '../config/db';
import { computeExecutionHealth } from './execution-health.service';
import { performance } from 'perf_hooks';

let isRunning = false;

export async function runDailyHealthSnapshot() {
    if (isRunning) {
        console.warn('[HealthCron] Previous run still active. Skipping.');
        return;
    }
    isRunning = true;
    const cronStart = performance.now();
    console.log('[HealthCron] Starting daily project health snapshot...');
    
    // Get all active projects
    const activeProjects = await prisma.project.findMany({
        where: { stage: { not: 'COMPLETED' } },
        select: { id: true, name: true, tenantId: true }
    });

    let snapshotsCreated = 0;
    let errors = 0;

    for (const project of activeProjects) {
        try {
            const healthResult = await computeExecutionHealth(project.id);
            const { executionHealth, breakdown } = healthResult;

            // Determine primary driver
            const domains = [
                { key: 'deadlinePressure', value: breakdown.deadlinePressure },
                { key: 'reworkInstability', value: breakdown.reworkInstability },
                { key: 'checklistPenalty', value: breakdown.checklistPenalty },
                { key: 'stageDeviation', value: breakdown.stageDeviation },
                { key: 'disciplineModifier', value: breakdown.disciplineModifier } // Even though it can be negative, it's a domain
            ];
            
            // Only consider positive drivers for "risk" dominance
            const positiveDrivers = domains.filter(d => d.value > 0);
            let primaryDriver = 'none';
            if (positiveDrivers.length > 0) {
                // Find max
                primaryDriver = positiveDrivers.reduce((max, d) => d.value > max.value ? d : max).key;
            }

            const extendedBreakdown = {
                ...breakdown,
                primaryDriver
            };

            // Get previous snapshot
            const prevSnapshot = await prisma.projectHealthSnapshot.findFirst({
                where: { projectId: project.id },
                orderBy: { snapshotDate: 'desc' }
            });

            let volatilityDelta: number | null = null;
            let shouldSnapshot = false;

            if (prevSnapshot) {
                volatilityDelta = Math.abs(executionHealth - prevSnapshot.health);
                // Refinement 1: Only snapshot if delta >= 3
                if (volatilityDelta >= 3) {
                    shouldSnapshot = true;
                }
            } else {
                // Always snapshot if no previous snapshot exists
                shouldSnapshot = true;
            }

            if (shouldSnapshot) {
                await prisma.projectHealthSnapshot.create({
                    data: {
                        projectId: project.id,
                        tenantId: project.tenantId,
                        health: executionHealth,
                        volatilityDelta: volatilityDelta,
                        breakdown: extendedBreakdown
                    }
                });
                snapshotsCreated++;

                // Refinement 2: Log threshold crossings over 3 points
                if (prevSnapshot) {
                    const prevRisk = getRiskCategory(prevSnapshot.health);
                    const currentRisk = getRiskCategory(executionHealth);

                    if (prevRisk !== currentRisk) {
                        console.log(`[HealthAlert] Project "${project.name}" crossed risk threshold: ${prevRisk} -> ${currentRisk} (Score: ${prevSnapshot.health} -> ${executionHealth})`);
                    }
                }
            }
        } catch (error) {
            console.error(`[HealthCron] Error snapshotting project ${project.id}:`, error);
            errors++;
        }
    }

    const cronDuration = performance.now() - cronStart;
    console.log(`[HealthCron] Completed in ${cronDuration.toFixed(0)}ms. Snapshots created: ${snapshotsCreated}. Errors: ${errors}.`);
    isRunning = false;
}

function getRiskCategory(health: number): string {
    if (health < 40) return 'STABLE';
    if (health < 60) return 'WATCH';
    return 'AT_RISK';
}

export function startHealthCron() {
    // Run daily at 1:15 AM
    // Offset from discipline cron (1:00 AM) to avoid spike
    cron.schedule('15 1 * * *', () => {
        runDailyHealthSnapshot().catch(console.error);
    });
    console.log('[HealthCron] Daily health snapshot job scheduled (1:15 AM).');
}
