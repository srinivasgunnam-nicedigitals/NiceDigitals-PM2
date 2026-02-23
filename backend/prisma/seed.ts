import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: '3b5339c6-12bc-4d96-a3ec-0d7b0b83d275' },
    update: {},
    create: {
      id: '3b5339c6-12bc-4d96-a3ec-0d7b0b83d275',
      name: 'Nice Digitals',
      createdAt: new Date()
    }
  });

  console.log('✅ Tenant created:', tenant.name);

  // Create users — IDs MUST be valid UUIDs (schema validates assignments as uuid)
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nicedigitals.com' },
    update: {},
    create: {
      id: 'a0000001-0000-4000-8000-000000000001',
      name: 'Admin User',
      email: 'admin@nicedigitals.com',
      password: hashedPassword,
      role: 'ADMIN',
      avatar: '/avatars/admin.jpg',
      tenantId: tenant.id
    }
  });

  const designer = await prisma.user.upsert({
    where: { email: 'designer@nicedigitals.com' },
    update: {},
    create: {
      id: 'a0000002-0000-4000-8000-000000000002',
      name: 'Jane Designer',
      email: 'designer@nicedigitals.com',
      password: hashedPassword,
      role: 'DESIGNER',
      avatar: '/avatars/designer.jpg',
      tenantId: tenant.id
    }
  });

  const devManager = await prisma.user.upsert({
    where: { email: 'dev@nicedigitals.com' },
    update: {},
    create: {
      id: 'a0000003-0000-4000-8000-000000000003',
      name: 'John Developer',
      email: 'dev@nicedigitals.com',
      password: hashedPassword,
      role: 'DEV_MANAGER',
      avatar: '/avatars/dev.jpg',
      tenantId: tenant.id
    }
  });

  const qa = await prisma.user.upsert({
    where: { email: 'qa@nicedigitals.com' },
    update: {},
    create: {
      id: 'a0000004-0000-4000-8000-000000000004',
      name: 'Sarah QA',
      email: 'qa@nicedigitals.com',
      password: hashedPassword,
      role: 'QA_ENGINEER',
      avatar: '/avatars/qa.jpg',
      tenantId: tenant.id
    }
  });

  console.log('✅ Users created:', [admin.name, designer.name, devManager.name, qa.name]);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
