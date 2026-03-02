import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        where: { stage: 'COMPLETED' },
        include: {
            assignedDesigner: { select: { id: true, name: true } },
            assignedDevManager: { select: { id: true, name: true } },
            assignedQA: { select: { id: true, name: true } },
            healthSnapshots: {
                orderBy: { snapshotDate: 'desc' },
                take: 1
            },
            history: {
                orderBy: { timestamp: 'desc' },
                take: 10
            }
        }
    });
    
    console.log(`Found ${projects.length} completed projects`);
    if (projects.length > 0) {
        const p = projects[0];
        console.log("Health at completion:", p.healthAtCompletion);
        console.log("Outcome:", p.actualOutcome);
        if (p.healthSnapshots.length > 0) {
            console.log("Snapshot breakdown:", JSON.stringify(p.healthSnapshots[0].breakdown, null, 2));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
