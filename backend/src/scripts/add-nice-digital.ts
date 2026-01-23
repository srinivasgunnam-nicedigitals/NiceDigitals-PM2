import { PrismaClient, UserRole, ProjectStage, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Setting up Nice Digital tenant...');

  try {
    // 1. Create Tenant
    const tenantName = 'Nice Digital';
    const tenantId = 'tenant-nice-digital';

    let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                id: tenantId,
                name: tenantName,
            }
        });
        console.log(`✅ Created Tenant: ${tenant.name}`);
    } else {
        console.log(`ℹ️  Found Tenant: ${tenant.name}`);
    }

    // 2. Create Users
    const password = 'SecretPassword123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const usersData = [
        { email: 'admin@nicedigital.com', name: 'Nice Admin', role: UserRole.ADMIN },
        { email: 'designer@nicedigital.com', name: 'Sarah Designer', role: UserRole.DESIGNER },
        { email: 'manager@nicedigital.com', name: 'Mike Manager', role: UserRole.DEV_MANAGER },
    ];

    const createdUsers = [];

    for (const u of usersData) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (!existing) {
            const newUser = await prisma.user.create({
                data: {
                    name: u.name,
                    email: u.email,
                    password: hashedPassword,
                    role: u.role,
                    tenantId: tenant.id,
                    avatar: `https://ui-avatars.com/api/?name=${u.name.replace(' ', '+')}&background=random`,
                }
            });
            createdUsers.push(newUser);
            console.log(`✅ Created User: ${u.email}`);
        } else {
            createdUsers.push(existing);
            console.log(`ℹ️  User exists: ${u.email}`);
        }
    }

    const admin = createdUsers[0];
    const designer = createdUsers[1];
    const manager = createdUsers[2];

    // 3. Create Projects
    const projectCounts = await prisma.project.count({ where: { tenantId: tenant.id } });
    
    if (projectCounts === 0) {
        console.log('Creating sample projects...');
        
        // Project 1: Website Redesign
        const p1 = await prisma.project.create({
            data: {
                name: 'Corporate Website Redesign',
                clientName: 'Acme Corp',
                scope: 'Full redesign of the corporate website including CMS migration.',
                priority: Priority.HIGH,
                stage: ProjectStage.DESIGN,
                overallDeadline: new Date('2026-06-01'),
                tenantId: tenant.id,
                assignedDesignerId: designer.id,
                assignedDevManagerId: manager.id,
                
                // Add Comments
                comments: {
                    create: [
                        { 
                            text: 'Initial designs look great!', 
                            userId: manager.id, 
                            tenantId: tenant.id 
                        },
                        { 
                            text: 'Waiting for client feedback on the moodboard.', 
                            userId: designer.id, 
                            tenantId: tenant.id 
                        }
                    ]
                },

                // Add History
                history: {
                    create: [
                        {
                            stage: ProjectStage.UPCOMING,
                            action: 'Project Created',
                            userId: admin.id,
                            tenantId: tenant.id
                        },
                        {
                            stage: ProjectStage.DESIGN,
                            action: 'Design Started',
                            userId: designer.id,
                            tenantId: tenant.id
                        }
                    ]
                }
            }
        });

        // Project 2: Mobile App
        await prisma.project.create({
            data: {
                name: 'Customer Loyalty App',
                clientName: 'Retail Giant',
                scope: 'iOS and Android app for customer loyalty program.',
                priority: Priority.URGENT,
                stage: ProjectStage.DEVELOPMENT,
                overallDeadline: new Date('2026-04-15'),
                tenantId: tenant.id,
                assignedDevManagerId: manager.id,
                
                comments: {
                    create: {
                        text: 'API integration is 50% complete.',
                        userId: manager.id,
                        tenantId: tenant.id
                    }
                },
                
                history: {
                    create: {
                        stage: ProjectStage.DEVELOPMENT,
                        action: 'Sprint 1 Started',
                        userId: manager.id,
                        tenantId: tenant.id
                    }
                }
            }
        });

        console.log('✅ Created 2 Sample Projects');
    }

    // 4. Create Scores
    const scoreCount = await prisma.scoreEntry.count({ where: { tenantId: tenant.id } });
    if (scoreCount === 0) {
        // Fetch a project to link score to
        const project = await prisma.project.findFirst({ where: { tenantId: tenant.id } });
        if (project) {
            await prisma.scoreEntry.create({
                data: {
                    points: 10,
                    reason: 'Excellent design delivery',
                    userId: designer.id,
                    projectId: project.id,
                    tenantId: tenant.id
                }
            });
            await prisma.scoreEntry.create({
                data: {
                    points: 5,
                    reason: 'Proactive communication',
                    userId: manager.id,
                    projectId: project.id,
                    tenantId: tenant.id
                }
            });
            console.log('✅ Created Sample Scores');
        }
    }

    console.log('\n🎉 Setup Complete!');
    
  } catch (error) {
    console.error('❌ Failed to seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
