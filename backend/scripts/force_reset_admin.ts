
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@nicedigitals.com';
    const newPass = 'NewPass123!';

    // Check for duplicates
    const users = await prisma.user.findMany({ where: { email } });
    console.log(`Found ${users.length} users with email ${email}`);
    if (users.length > 1) {
        console.error("CRITICAL: DUPLICATE USERS FOUND!");
        users.forEach(u => console.log(` - ID: ${u.id}, Role: ${u.role}`));
    }

    const user = users[0];
    if (!user) throw new Error("User not found");

    console.log(`Updating password for user ${user.id} (${user.email})...`);

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    console.log(`Password updated to '${newPass}' (hashed)`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
