const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.project.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { name: true, scope: true }
    });
    console.log(JSON.stringify(p, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
