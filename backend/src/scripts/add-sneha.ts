import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding user Sneha...');

  try {
    // 1. Get Default Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: 'tenant-default' }
    });

    if (!tenant) {
      console.error('❌ Default tenant not found! Please run create-admin.ts first.');
      return;
    }

    // 2. Create User
    const user = await prisma.user.create({
      data: {
        name: 'Sneha',
        email: 'sneha@nice.com',
        password: 'Abc@123', // Storing assuming schema allows it, though mock auth ignores it
        role: UserRole.DESIGNER, // Assuming Designer based on typical persona, could be Admin
        tenantId: tenant.id,
        avatar: 'https://ui-avatars.com/api/?name=Sneha&background=ec4899&color=fff',
      },
    });
    console.log('✅ Created User:', user.email);
    
  } catch (error) {
    console.error('❌ Failed to add user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
