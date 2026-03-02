import { PrismaClient, UserRole, Priority, ProjectStage } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting minimal clean seed...');

  // 1️⃣ Tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: uuidv4(),
      name: 'Nice Digitals',
    },
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2️⃣ Users (7 total)
  const users = await prisma.user.createMany({
    data: [
      {
        id: uuidv4(),
        name: 'Admin User',
        email: 'admin@nicedigitals.com',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: tenant.id,
      },
      {
        id: uuidv4(),
        name: 'Designer One',
        email: 'designer1@nicedigitals.com',
        password: hashedPassword,
        role: 'DESIGNER',
        tenantId: tenant.id,
      },
      {
        id: uuidv4(),
        name: 'Designer Two',
        email: 'designer2@nicedigitals.com',
        password: hashedPassword,
        role: 'DESIGNER',
        tenantId: tenant.id,
      },
      {
        id: uuidv4(),
        name: 'Dev Manager One',
        email: 'dev1@nicedigitals.com',
        password: hashedPassword,
        role: 'DEV_MANAGER',
        tenantId: tenant.id,
      },
      {
        id: uuidv4(),
        name: 'Dev Manager Two',
        email: 'dev2@nicedigitals.com',
        password: hashedPassword,
        role: 'DEV_MANAGER',
        tenantId: tenant.id,
      },
      {
        id: uuidv4(),
        name: 'QA Engineer One',
        email: 'qa1@nicedigitals.com',
        password: hashedPassword,
        role: 'QA_ENGINEER',
        tenantId: tenant.id,
      },
      {
        id: uuidv4(),
        name: 'QA Engineer Two',
        email: 'qa2@nicedigitals.com',
        password: hashedPassword,
        role: 'QA_ENGINEER',
        tenantId: tenant.id,
      },
    ],
  });

  const allUsers = await prisma.user.findMany({
    where: { tenantId: tenant.id },
  });

  const admin = allUsers.find(u => u.role === 'ADMIN')!;
  const designers = allUsers.filter(u => u.role === 'DESIGNER');
  const devs = allUsers.filter(u => u.role === 'DEV_MANAGER');
  const qas = allUsers.filter(u => u.role === 'QA_ENGINEER');

  console.log('✅ Users created');

  // 3️⃣ Projects (6 Active Only — No Completed)
  const now = new Date();

  const projects = await prisma.project.createMany({
    data: [
      {
        id: uuidv4(),
        name: 'Acme Website Revamp',
        clientName: 'Acme Corp',
        scope: 'Corporate website redesign',
        priority: 'HIGH',
        stage: 'DISCOVERY',
        overallDeadline: new Date(now.getTime() + 15 * 86400000),
        currentDeadline: new Date(now.getTime() + 15 * 86400000),
        tenantId: tenant.id,
        enteredStageAt: now,
      },
      {
        id: uuidv4(),
        name: 'Mobile App UI',
        clientName: 'Stark Industries',
        scope: 'Mobile application design and dev',
        priority: 'MEDIUM',
        stage: 'DESIGN',
        overallDeadline: new Date(now.getTime() + 20 * 86400000),
        currentDeadline: new Date(now.getTime() + 20 * 86400000),
        tenantId: tenant.id,
        assignedDesignerId: designers[0].id,
        enteredStageAt: now,
      },
      {
        id: uuidv4(),
        name: 'Backend Refactor',
        clientName: 'Wayne Enterprises',
        scope: 'Core backend restructuring',
        priority: 'HIGH',
        stage: 'DEVELOPMENT',
        overallDeadline: new Date(now.getTime() + 10 * 86400000),
        currentDeadline: new Date(now.getTime() + 10 * 86400000),
        tenantId: tenant.id,
        assignedDesignerId: designers[1].id,
        assignedDevManagerId: devs[0].id,
        enteredStageAt: new Date(now.getTime() - 2 * 86400000),
      },
      {
        id: uuidv4(),
        name: 'Analytics Dashboard',
        clientName: 'Globex',
        scope: 'BI dashboard implementation',
        priority: 'URGENT',
        stage: 'INTERNAL_QA',
        overallDeadline: new Date(now.getTime() + 7 * 86400000),
        currentDeadline: new Date(now.getTime() + 7 * 86400000),
        tenantId: tenant.id,
        assignedDesignerId: designers[0].id,
        assignedDevManagerId: devs[1].id,
        assignedQAId: qas[0].id,
        enteredStageAt: new Date(now.getTime() - 3 * 86400000),
      },
      {
        id: uuidv4(),
        name: 'CRM Integration',
        clientName: 'Initech',
        scope: 'CRM integration with ERP',
        priority: 'MEDIUM',
        stage: 'CLIENT_REVIEW',
        overallDeadline: new Date(now.getTime() + 12 * 86400000),
        currentDeadline: new Date(now.getTime() + 12 * 86400000),
        tenantId: tenant.id,
        assignedDesignerId: designers[1].id,
        enteredStageAt: new Date(now.getTime() - 1 * 86400000),
      },
      {
        id: uuidv4(),
        name: 'E-commerce Platform',
        clientName: 'Massive Dynamic',
        scope: 'Full e-commerce solution',
        priority: 'HIGH',
        stage: 'DEPLOYMENT',
        overallDeadline: new Date(now.getTime() + 5 * 86400000),
        currentDeadline: new Date(now.getTime() + 5 * 86400000),
        tenantId: tenant.id,
        assignedDesignerId: designers[0].id,
        assignedDevManagerId: devs[0].id,
        assignedQAId: qas[1].id,
        enteredStageAt: new Date(now.getTime() - 4 * 86400000),
      },
    ],
  });

  console.log('✅ Minimal projects created');

  console.log('🎉 Clean minimal seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });