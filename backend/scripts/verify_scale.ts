import { passwordService } from '../src/services/password.service';
import { prisma } from '../src/config/db';
import '../src/workers/audit.worker'; // Run worker in this process to verify logic

async function verify() {
    console.log('--- STARTING SCALE-SAFE VERIFICATION ---');

    try {
        // 1. Verify Password Worker
        console.log('[1/3] Testing Password Worker...');
        const start = Date.now();
        const hash = await passwordService.hash('test-password');
        const end = Date.now();
        console.log(` ✅ Hashed in ${end - start}ms: ${hash.substring(0, 20)}...`);

        const valid = await passwordService.compare('test-password', hash);
        console.log(` ✅ Comparison Result: ${valid}`);
        if (!valid) throw new Error('Password verification failed');

        // 2. Verify Audit Worker
        console.log('[2/3] Testing Audit Worker (Outbox -> Log)...');

        // Create manual outbox entry
        const outboxId = 'test-outbox-' + Date.now();
        await prisma.auditOutbox.create({
            data: {
                id: outboxId,
                action: 'VERIFY_TEST',
                target: 'Scale Verification Script',
                actorId: 'system',
                actorEmail: 'system@remote',
                tenantId: 'system-tenant', // Dummy
                metadata: { test: true },
                createdAt: new Date()
            }
        });
        console.log(' ✅ Created AuditOutbox entry. Waiting for worker (max 5s)...');

        // Poll for AuditLog
        let found = false;
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms
            const log = await prisma.auditLog.findFirst({
                where: { action: 'VERIFY_TEST', metadata: { path: ['test'], equals: true } }
                // Note: Prisma JSON filter might be tricky, let's search by actorId/action
            });
            // Re-query by ID if possible, but AuditLog ID is different.
            // Search by unique action + time
            const logEntry = await prisma.auditLog.findFirst({
                where: {
                    action: 'VERIFY_TEST',
                    actorId: 'system',
                    target: 'Scale Verification Script'
                }
            });

            if (logEntry) {
                console.log(' ✅ Found entry in AuditLog table!');
                found = true;

                // Verify Outbox is drained
                const outboxEntry = await prisma.auditOutbox.findUnique({ where: { id: outboxId } });
                if (!outboxEntry) {
                    console.log(' ✅ AuditOutbox entry successfully deleted.');
                } else {
                    console.error(' ❌ AuditOutbox entry NOT deleted (Worker might have failed delete).');
                }
                break;
            }
        }

        if (!found) {
            console.error(' ❌ Timeout: Audit entry did not appear in AuditLog table.');
            // Check if worker is running? We can't check process list easily.
        }

        console.log('--- VERIFICATION COMPLETE ---');
        process.exit(0);

    } catch (error) {
        console.error('VERIFICATION FAILED:', error);
        process.exit(1);
    }
}

verify();
