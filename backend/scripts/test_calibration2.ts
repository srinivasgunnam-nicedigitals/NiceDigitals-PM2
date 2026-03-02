import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            stage: true,
            healthAtCompletion: true,
            actualOutcome: true
        }
    });
    
    console.log(`Total projects: ${projects.length}`);
    for(const p of projects) {
        if (p.actualOutcome != null || p.stage === 'COMPLETED' || p.healthAtCompletion != null) {
            console.log(`- ${p.name}: stage=${p.stage}, outcome=${p.actualOutcome}, health=${p.healthAtCompletion}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
