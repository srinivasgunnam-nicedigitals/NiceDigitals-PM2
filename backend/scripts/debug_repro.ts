
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log("--- STARTING REPRO TEST ---");
    const email = `repro_${Date.now()}@test.com`;
    const oldPass = 'OldPass123!';
    const newPass = 'NewPass456!';

    // 1. Create User with Old Password (Hashed)
    const oldHash = await bcrypt.hash(oldPass, 10);
    const user = await prisma.user.create({
        data: {
            name: 'Repro User',
            email,
            password: oldHash,
            role: 'ADMIN',
            tenant: {
                create: { name: 'Repro Tenant' }
            }
        }
    });
    console.log(`1. Created user ${email} with password '${oldPass}'`);

    // 2. Test Login with Old Password
    let u = await prisma.user.findUnique({ where: { email } });
    if (!u || !u.password) throw new Error("User not found or no password");

    let isBcrypt = u.password.startsWith('$2');
    let isValid = false;
    if (isBcrypt) {
        isValid = await bcrypt.compare(oldPass, u.password);
    } else {
        isValid = (u.password === oldPass);
    }
    console.log(`2. Login with Old Password: ${isValid ? 'SUCCESS' : 'FAIL'} (Expected: SUCCESS)`);

    // 3. Reset Password to New Password
    const newHash = await bcrypt.hash(newPass, 10);
    await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash }
    });
    console.log(`3. Reset password to '${newPass}'`);

    // 4. Test Login with New Password
    u = await prisma.user.findUnique({ where: { email } });
    if (!u || !u.password) throw new Error("User not found via findUnique");

    // Verify DB actually updated
    console.log(`   DB stored password: ${u.password}`);

    isBcrypt = u.password.startsWith('$2');
    if (isBcrypt) {
        isValid = await bcrypt.compare(newPass, u.password);
    } else {
        isValid = (u.password === newPass);
    }
    console.log(`4. Login with New Password: ${isValid ? 'SUCCESS' : 'FAIL'} (Expected: SUCCESS)`);

    // 5. Test Login with OLD Password (CRITICAL CHECK)
    // Re-fetch just to be safe
    u = await prisma.user.findUnique({ where: { email } });
    if (!u || !u.password) throw new Error("User not found");

    isBcrypt = u.password.startsWith('$2');
    if (isBcrypt) {
        isValid = await bcrypt.compare(oldPass, u.password);
    } else {
        isValid = (u.password === oldPass);
    }
    console.log(`5. Login with OLD Password: ${isValid ? 'SUCCESS' : 'FAIL'} (Expected: FAIL)`);

    if (isValid) {
        console.error("CRITICAL ERROR: OLD PASSWORD STILL WORKS!");
    } else {
        console.log("PASS: Old password correctly rejected.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
