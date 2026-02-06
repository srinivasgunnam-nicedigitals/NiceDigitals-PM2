import { parentPort } from 'worker_threads';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

        // 2. Transpose to AuditLog
        const audits = items.map(item => ({
            action: item.action,
            target: item.target,
            actorId: item.actorId,
            actorEmail: item.actorEmail,
            tenantId: item.tenantId,
            metadata: item.metadata || {}, // Handle null json
            timestamp: item.createdAt // Preserve original timestamp
        }));

        // 3. Transaction: Write to AuditLog + Delete from Outbox
        await prisma.$transaction(async (tx) => {
            await tx.auditLog.createMany({
                data: audits
            });

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
