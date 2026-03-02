import { computeExecutionHealth } from '../src/services/execution-health.service';
import { prisma } from '../src/config/db';

async function stressTestModel() {
    console.log('--- EXECUTING HEALTH MODEL STRESS TEST ---\n');

    // Setup: We need a temporary project to run computeExecutionHealth against
    // We will manipulate this project directly in the DB and see how the score changes
    
    // 1. Get a random active project to borrow its tenant/users
    const baseProject = await prisma.project.findFirst({
        where: { stage: { not: 'COMPLETED' } }
    });

    if (!baseProject) {
        console.log('No active projects found to use as a baseline for testing.');
        return;
    }

    // Create our test dummy
    const dummy = await prisma.project.create({
        data: {
            name: 'STRESS_TEST_DUMMY',
            clientName: 'Testing Corp',
            scope: 'Testing the health engine',
            priority: 'MEDIUM',
            stage: 'DEVELOPMENT',
            overallDeadline: new Date(), // Due today
            tenantId: baseProject.tenantId,
            assignedDevManagerId: baseProject.assignedDevManagerId,
            assignedDesignerId: baseProject.assignedDesignerId,
            assignedQAId: baseProject.assignedQAId,
            enteredStageAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days in stage
        }
    });

    try {
        // CASE 1: Absolute disaster (Due today, 30 days in stage, no checklist, high rework)
        // Add 3 high-severity reverts
        await prisma.historyItem.createMany({
            data: [
                { projectId: dummy.id, tenantId: dummy.tenantId, userId: baseProject.assignedDevManagerId || 'test-user', stage: 'DEVELOPMENT', revertReasonCategory: 'DEV_IMPLEMENTATION_BUG', action: 'Revert', timestamp: new Date() },
                { projectId: dummy.id, tenantId: dummy.tenantId, userId: baseProject.assignedDevManagerId || 'test-user', stage: 'DEVELOPMENT', revertReasonCategory: 'DEV_IMPLEMENTATION_BUG', action: 'Revert', timestamp: new Date() },
                { projectId: dummy.id, tenantId: dummy.tenantId, userId: baseProject.assignedQAId || 'test-user', stage: 'DEVELOPMENT', revertReasonCategory: 'QA_MISS', action: 'Revert', timestamp: new Date() }
            ]
        });

        const case1 = await computeExecutionHealth(dummy.id);
        console.log('CASE 1: High Rework, Overdue, Stalled');
        console.log(`Risk Score: ${case1.executionHealth} (${case1.atRisk ? 'AT RISK' : 'STABLE'})`);
        console.log(JSON.stringify(case1.breakdown, null, 2));
        console.log('--------------------------------------------------\n');

        // CASE 2: Velocity Abuse (Fast to complete checklist, but massive rework)
        // Update dummy to have 100% checklist completion
        await prisma.project.update({
            where: { id: dummy.id },
            data: { 
                devChecklist: [
                    { id: '1', label: 'Task 1', completed: true },
                    { id: '2', label: 'Task 2', completed: true }
                ]
            }
        });

        const case2 = await computeExecutionHealth(dummy.id);
        console.log('CASE 2: Velocity Abuse (100% Checklist BUT High Rework & Overdue)');
        console.log(`Risk Score: ${case2.executionHealth} (${case2.atRisk ? 'AT RISK' : 'STABLE'})`);
        console.log('Checklist Penalty:', case2.breakdown.checklistPenalty, ' (Should be 0)');
        console.log('Rework Instability:', case2.breakdown.reworkInstability, ' (Should be high)');
        console.log('--------------------------------------------------\n');

        // CASE 3: Recovery (Extend deadline, clear rework by changing dates to > 30 days ago)
        await prisma.project.update({
            where: { id: dummy.id },
            data: { 
                overallDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Due in 60 days
                enteredStageAt: new Date() // Just entered stage
            }
        });

        await prisma.historyItem.updateMany({
            where: { projectId: dummy.id },
            data: { timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // Old reverts (should be ignored)
        });

        const case3 = await computeExecutionHealth(dummy.id);
        console.log('CASE 3: Recovery (Extended Deadline, Clean Recent History, 100% Checklist)');
        console.log(`Risk Score: ${case3.executionHealth} (${case3.atRisk ? 'AT RISK' : 'STABLE'})`);
        console.log(JSON.stringify(case3.breakdown, null, 2));
        console.log('--------------------------------------------------\n');

    } finally {
        // Cleanup
        await prisma.historyItem.deleteMany({ where: { projectId: dummy.id } });
        await prisma.projectHealthSnapshot.deleteMany({ where: { projectId: dummy.id } });
        await prisma.project.delete({ where: { id: dummy.id } });
        console.log('Test dummy cleaned up.');
    }
}

stressTestModel()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
