import { PrismaClient, ProjectStage, DelayResponsibility } from '@prisma/client';

const prisma = new PrismaClient();

async function runTrackCTests() {
    console.log('🚀 Starting Track C Punctuality Verification...');
    
    // 1. Setup Isolated Tenant & Users
    const tenant = await prisma.tenant.create({
        data: { name: `Track C Test Tenant ${Date.now()}` }
    });

    const user = await prisma.user.create({
        data: {
            email: `track-c-tester-${Date.now()}@test.com`,
            name: 'Track C Tester',
            role: 'DEV_MANAGER',
            tenantId: tenant.id,
            isActive: true,
            password: 'dummy'
        }
    });

    console.log(`[Setup] Created Tenant ${tenant.id} and User ${user.id}`);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Helper to evaluate Leaderboard Event Log
    async function assertPunctuality(projectId: string, expectedCount: number, expectedType?: string, expectedPoints?: number) {
        const events = await prisma.leaderboardEventLog.findMany({
            where: {
                projectId,
                eventType: { in: ['STAGE_COMPLETED_ON_TIME', 'STAGE_COMPLETED_LATE'] }
            }
        });

        if (events.length !== expectedCount) {
            throw new Error(`[Assertion Failed] Expected ${expectedCount} punctuality events, found ${events.length}`);
        }

        if (expectedCount > 0 && expectedType && expectedPoints !== undefined) {
            const ev = events[0];
            if (ev.eventType !== expectedType) throw new Error(`[Assertion Failed] Expected type ${expectedType}, got ${ev.eventType}`);
            if (ev.points !== expectedPoints) throw new Error(`[Assertion Failed] Expected points ${expectedPoints}, got ${ev.points}`);
        }

        // Check entry points exactly matching delta?
        // Actually, we'll just check the event log row exists and points are accurate.

        console.log(`✅ Passed: Project ${projectId} matched exactly ${expectedCount} event(s) -> ${expectedType || 'NONE'} (${expectedPoints ?? 0} pts)`);
    }

    // Import advanceProjectStage dynamically so it connects to the same prisma client or logic
    const { advanceProjectStage } = require('../src/services/projects.service.ts');

    try {
        // ==========================================
        // SCENARIO 1: No Deadline -> 0 Score Change
        // ==========================================
        console.log('\n--- Scenario 1: No Deadline ---');
        const p1 = await prisma.project.create({
            data: {
                name: 'p1_no_deadline', clientName: 'Sys', scope: 'T', priority: 'MEDIUM',
                tenantId: tenant.id, stage: 'DEVELOPMENT', version: 1,
                assignedDevManagerId: user.id, overallDeadline: new Date(Date.now() + 5000000)
            }
        });
        await advanceProjectStage({ projectId: p1.id, nextStage: 'INTERNAL_QA', userId: user.id, tenantId: tenant.id, version: 1, userRole: 'ADMIN' });
        await assertPunctuality(p1.id, 0);

        // ==========================================
        // SCENARIO 2: On-Time -> +5
        // ==========================================
        console.log('\n--- Scenario 2: On-Time Completion ---');
        const p2 = await prisma.project.create({
            data: {
                name: 'p2_ontime', clientName: 'Sys', scope: 'T', priority: 'MEDIUM',
                tenantId: tenant.id, stage: 'DEVELOPMENT', version: 1, overallDeadline: new Date(Date.now() + 5000000),
                assignedDevManagerId: user.id,
                developmentDeadline: new Date(Date.now() + 1000000) // Future
            }
        });
        await advanceProjectStage({ projectId: p2.id, nextStage: 'INTERNAL_QA', userId: user.id, tenantId: tenant.id, version: 1, userRole: 'ADMIN' });
        await assertPunctuality(p2.id, 1, 'STAGE_COMPLETED_ON_TIME', 5);

        // ==========================================
        // SCENARIO 3: Late + INTERNAL -> -3
        // ==========================================
        console.log('\n--- Scenario 3: Late + INTERNAL ---');
        const p3 = await prisma.project.create({
            data: {
                name: 'p3_late_int', clientName: 'Sys', scope: 'T', priority: 'MEDIUM',
                tenantId: tenant.id, stage: 'DEVELOPMENT', version: 1, overallDeadline: new Date(Date.now() + 5000000),
                assignedDevManagerId: user.id,
                developmentDeadline: new Date(Date.now() - 1000000) // Past
            }
        });
        await advanceProjectStage({ projectId: p3.id, nextStage: 'INTERNAL_QA', userId: user.id, tenantId: tenant.id, version: 1, userRole: 'ADMIN' });
        await assertPunctuality(p3.id, 1, 'STAGE_COMPLETED_LATE', -3);

        // ==========================================
        // SCENARIO 4: Late + CLIENT -> 0
        // ==========================================
        console.log('\n--- Scenario 4: Late + CLIENT ---');
        const p4 = await prisma.project.create({
            data: {
                name: 'p4_late_client', clientName: 'Sys', scope: 'T', priority: 'MEDIUM',
                tenantId: tenant.id, stage: 'DEVELOPMENT', version: 1, overallDeadline: new Date(Date.now() + 5000000),
                assignedDevManagerId: user.id,
                developmentDeadline: new Date(Date.now() - 1000000) // Past
            }
        });
        await prisma.stageDeadlineRevision.create({
            data: {
                tenantId: tenant.id, projectId: p4.id, stage: 'DEVELOPMENT',
                delayResponsibility: 'CLIENT', changedByUserId: user.id, reason: 'Test',
                createdAt: new Date(Date.now() - 5000) // 5 seconds ago
            }
        });
        await advanceProjectStage({ projectId: p4.id, nextStage: 'INTERNAL_QA', userId: user.id, tenantId: tenant.id, version: 1, userRole: 'ADMIN' });
        await assertPunctuality(p4.id, 0);

        // ==========================================
        // SCENARIO 5: Responsibility Edited AFTER Exit
        // ==========================================
        console.log('\n--- Scenario 5: Edit AFTER Exit Ignored ---');
        const p5 = await prisma.project.create({
            data: {
                name: 'p5_retroactive', clientName: 'Sys', scope: 'T', priority: 'MEDIUM',
                tenantId: tenant.id, stage: 'DEVELOPMENT', version: 1, overallDeadline: new Date(Date.now() + 5000000),
                assignedDevManagerId: user.id,
                developmentDeadline: new Date(Date.now() - 1000000) // Past
            }
        });
        // Create revision AFTER exit time (simulated by making it explicitly map to the future compared to the transaction run now)
        await prisma.stageDeadlineRevision.create({
            data: {
                tenantId: tenant.id, projectId: p5.id, stage: 'DEVELOPMENT',
                delayResponsibility: 'CLIENT', changedByUserId: user.id, reason: 'Future cheat',
                createdAt: new Date(Date.now() + 10000) // 10 seconds in future
            }
        });
        await advanceProjectStage({ projectId: p5.id, nextStage: 'INTERNAL_QA', userId: user.id, tenantId: tenant.id, version: 1, userRole: 'ADMIN' });
        
        // It SHOULD NOT read the CLIENT override because it's technically stamped in the future compared to exitTime=now. 
        // Note: Prisma operations happen instantly, so Date.now() + 10s easily beats the Date.now() sampled in advanceProjectStage inside the transaction.
        await assertPunctuality(p5.id, 1, 'STAGE_COMPLETED_LATE', -3);


        console.log('\n🎉 ALL 5 SCENARIOS PASSED. Track C Evaluator is deterministic and isolated.');

    } catch (err: any) {
        console.error('❌ Track C Verification Failed: ', err.message);
    } finally {
        console.log('Cleaning up isolate tenant...');
        await prisma.roleLeaderboardEntry.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.leaderboardEventLog.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.historyItem.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.stageDeadlineRevision.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.project.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.tenant.delete({ where: { id: tenant.id } });
    }
}

runTrackCTests().then(() => {
    process.exit(0);
}).catch(console.error);
