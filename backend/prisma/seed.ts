import { PrismaClient, UserRole, Priority, ProjectStage } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Helper to generate random dates after April 1, 2026
const getRandomDateAfterApril2026 = () => {
    const start = new Date(2026, 3, 1).getTime(); // April 1, 2026
    const end = new Date(2027, 11, 31).getTime(); // Dec 31, 2027
    return new Date(start + Math.random() * (end - start));
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
    console.log('🌱 Starting massive database seed...');

    // 1. Create or ensure tenant
    const tenantId = '3b5339c6-12bc-4d96-a3ec-0d7b0b83d275';
    const tenant = await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: {
            id: tenantId,
            name: 'Nice Digitals',
            createdAt: new Date()
        }
    });
    console.log(`✅ Tenant created/verified: ${tenant.name}`);

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 2. Generate 100 Users
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Daniela', 'George', 'Melissa', 'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda', 'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen', 'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Gregory', 'Christine', 'Alexander', 'Debra', 'Patrick', 'Rachel', 'Frank', 'Carolyn', 'Raymond', 'Janet', 'Jack', 'Catherine', 'Dennis', 'Maria', 'Jerry', 'Heather'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennet', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];

    // Distribution: 5 Admins, 35 Designers, 35 Dev Managers, 25 QA Engineers
    const rolesDistribution = [
        ...Array(5).fill('ADMIN'),
        ...Array(35).fill('DESIGNER'),
        ...Array(35).fill('DEV_MANAGER'),
        ...Array(25).fill('QA_ENGINEER')
    ];

    const usersToCreate = rolesDistribution.map((role, index) => {
        const i = index + 1;
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        const fullName = `${firstName} ${lastName}`;
        // Create an email safe version of the first name, avoiding special chars, standardising exactly.
        const emailSafeName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');

        return {
            id: uuidv4(),
            name: fullName,
            email: `${emailSafeName}${i}@nicedigitals.com`,
            password: hashedPassword,
            role: role as UserRole,
            tenantId: tenant.id,
            avatar: `/avatars/${role.toLowerCase()}.jpg`,
        };
    });

    console.log('⏳ Inserting 100 users...');
    await prisma.user.createMany({
        data: usersToCreate,
        skipDuplicates: true, // In case we run it multiple times
    });

    // Fetch them back to get actual DB references for assignments
    const allUsers = await prisma.user.findMany({ where: { tenantId } });
    const designers = allUsers.filter(u => u.role === 'DESIGNER');
    const devs = allUsers.filter(u => u.role === 'DEV_MANAGER');
    const qas = allUsers.filter(u => u.role === 'QA_ENGINEER');

    console.log(`✅ ${allUsers.length} users ready.`);

    // 3. Define 17 Clients
    const clientNames = [
        'Acme Corp', 'Stark Industries', 'Wayne Enterprises', 'Umbrella Corp',
        'Cyberdyne Systems', 'Hooli', 'Pied Piper', 'Initech', 'Globex',
        'Soylent Corp', 'Massive Dynamic', 'Oscorp', 'Aperture Science',
        'Black Mesa', 'Virtucon', 'Dunder Mifflin', 'Buy n Large'
    ];
    console.log(`✅ 17 distinct clients defined.`);

    // 4. Generate 150 Projects
    const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const projectTypes = ['Website Redesign', 'Mobile App', 'Backend Refactor', 'Marketing Site', 'E-commerce Platform', 'CRM Integration', 'Analytics Dashboard'];
    
    // Stages: Mostly Active, some completed
    const stages: ProjectStage[] = ['UPCOMING', 'DESIGN', 'DEVELOPMENT', 'QA', 'SEND_TO_CLIENT', 'SENT_TO_CLIENT', 'COMPLETED', 'ADMIN_REVIEW'];

    console.log('⏳ Preparing 150 projects...');
    const projectsData = Array.from({ length: 150 }).map((_, i) => {
        const client = getRandomItem(clientNames);
        const pType = getRandomItem(projectTypes);
        const priority = getRandomItem(priorities);
        const stage = getRandomItem(stages);
        const deadline = getRandomDateAfterApril2026();
        
        // Randomly assign users if past UPCOMING stage
        let designerId = null;
        let devId = null;
        let qaId = null;

        if (stage !== 'UPCOMING') {
            designerId = getRandomItem(designers).id;
            if (['DEVELOPMENT', 'QA', 'SEND_TO_CLIENT', 'SENT_TO_CLIENT', 'COMPLETED', 'ADMIN_REVIEW'].includes(stage)) {
                devId = getRandomItem(devs).id;
            }
            if (['QA', 'SEND_TO_CLIENT', 'SENT_TO_CLIENT', 'COMPLETED', 'ADMIN_REVIEW'].includes(stage)) {
                qaId = getRandomItem(qas).id;
            }
        }

        return {
            id: uuidv4(),
            name: `${client} - ${pType} ${i + 1}`,
            clientName: client,
            scope: `Standard ${pType} scope covering requirements gathering, design, implementation, and testing.`,
            priority: priority,
            stage: stage,
            overallDeadline: deadline,
            currentDeadline: deadline,
            tenantId: tenant.id,
            assignedDesignerId: designerId,
            assignedDevManagerId: devId,
            assignedQAId: qaId,
            createdAt: new Date(),
            updatedAt: new Date(),
            qaFailCount: Math.floor(Math.random() * 3), // 0 to 2 fails
            completedAt: stage === 'COMPLETED' ? new Date() : null,
        };
    });

    console.log('⏳ Inserting 150 projects...');
    // createMany handles massive inserts efficiently
    const projectResult = await prisma.project.createMany({
        data: projectsData,
        skipDuplicates: true
    });

    console.log(`✅ ${projectResult.count} projects created successfully!`);

    console.log('🎉 Massive Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
