import { parentPort } from 'worker_threads';
import { prisma } from '../config/db';

const BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 1000;

async function processOutbox() {
    try {
        // 1. Fetch batch from Outbox
        const items = await prisma.auditOutbox.findMany({
            take: BATCH_SIZE,
            orderBy: { createdAt: 'asc' }
        });

        if (items.length === 0) {
            return; // Nothing to process
        }

        console.log(`[AuditWorker] Processing ${items.length} items...`);

        // 2. Validate Tenants
        const tenantIds = Array.from(new Set(items.map(i => i.tenantId)));
        const existingTenants = await prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true }
        });
        const validTenantIds = new Set(existingTenants.map(t => t.id));

        const validItems = items.filter(item => validTenantIds.has(item.tenantId));
        const invalidItems = items.filter(item => !validTenantIds.has(item.tenantId));

        if (invalidItems.length > 0) {
            console.warn(`[AuditWorker] Dropping ${invalidItems.length} items for missing tenants:`, invalidItems.map(i => i.tenantId));
        }

        // 3. Transpose Valid Items Only
        const audits = validItems.map(item => ({
            action: item.action,
            target: item.target,
            actorId: item.actorId,
            actorEmail: item.actorEmail,
            tenantId: item.tenantId,
            metadata: item.metadata || {}, // Handle null json
            timestamp: item.createdAt // Preserve original timestamp
        }));

        // 4. Transaction: Write Valid to AuditLog + Delete ALL from Outbox
        await prisma.$transaction(async (tx) => {
            if (audits.length > 0) {
                await tx.auditLog.createMany({
                    data: audits
                });
            }

            // Always delete the batch from outbox so we don't get stuck in a loop
            await tx.auditOutbox.deleteMany({
                where: {
                    id: { in: items.map(i => i.id) }
                }
            });
        });

        console.log(`[AuditWorker] Successfully processed ${items.length} items.`);

        // If we found a full batch, process immediately again
        if (items.length === BATCH_SIZE) {
            processOutbox();
        }

    } catch (error) {
        console.error('[AuditWorker] Error processing outbox:', error);
        // Retry will happen on next poll interval naturally
    }
}

// Start polling loop
setInterval(processOutbox, POLL_INTERVAL_MS);

// Handle messages from main thread (if needed)
if (parentPort) {
    parentPort.on('message', (msg) => {
        if (msg === 'STOP') {
            process.exit(0);
        }
    });
}

console.log('[AuditWorker] Started.');
