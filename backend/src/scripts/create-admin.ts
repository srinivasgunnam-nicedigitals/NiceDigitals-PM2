import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Create a Default Tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'tenant-default', // Explicit ID to match middleware mock
        name: 'Demo Agency',
      },
    });
    console.log('✅ Created Tenant:', tenant.name);

    // 2. Create an Admin User
    const adminUser = await prisma.user.create({
      data: {
        id: 'mock-admin-id', // Explicit ID to match middleware mock
        name: 'Admin User',
        email: 'admin@demo.com',
        password: '$2a$10$z.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', // Dummy hash
        role: UserRole.ADMIN,
        tenantId: tenant.id,
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff',
      },
    });
    console.log('✅ Created User:', adminUser.email);

    console.log('🚀 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
