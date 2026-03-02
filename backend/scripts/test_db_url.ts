import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log("DB URL inside script:", process.env.DATABASE_URL);
    const count = await prisma.project.count();
    console.log("Total projects:", count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
