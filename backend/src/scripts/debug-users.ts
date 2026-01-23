import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Debugging Users...');

  // 1. Get all tenants
  const tenants = await prisma.tenant.findMany();
  console.log(`\nFound ${tenants.length} tenants:`);
  tenants.forEach(t => console.log(`- ${t.name} (${t.id})`));

  // 2. Get all users
  const users = await prisma.user.findMany({
      include: { tenant: true }
  });
  console.log(`\nFound ${users.length} users:`);
  users.forEach(u => {
      console.log(`- [${u.tenant.name}] ${u.name} (${u.email}) | Role: ${u.role} | ID: ${u.id}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
