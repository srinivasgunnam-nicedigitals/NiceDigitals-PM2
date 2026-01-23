import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lastUser = await prisma.user.findFirst({
    orderBy: { id: 'desc' }, // If UUID, this order might be random-ish, but let's try. 
    // Actually UUIDs are not ordered by time usually. 
    // But we don't have createdAt on User.
    // Let's filter by tenant Name "Nice Digital".
    include: { tenant: true }
  });
  
  // Alternative: Find by email if we know it? User didn't say.
  // Let's list all users in "Nice Digital"
  const tenant = await prisma.tenant.findFirst({ where: { name: 'Nice Digital' } });
  if (tenant) {
      const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
      console.log('Users in Nice Digital:');
      console.log(JSON.stringify(users, null, 2));
  } else {
      console.log('Tenant Nice Digital not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
