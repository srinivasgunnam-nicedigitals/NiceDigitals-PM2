import { prisma } from '../config/db';

interface AuditParams {
    action: string;
    target: string;
    actorId: string;
    actorEmail?: string;
    tenantId: string;
    metadata?: any;
}

export const logAudit = async (params: AuditParams, tx?: any, options?: { allowFailOpen?: boolean }) => {
    try {
        const client = tx || prisma;
        await client.auditLog.create({
            data: {
                action: params.action,
                target: params.target,
                actorId: params.actorId,
                actorEmail: params.actorEmail,
                tenantId: params.tenantId,
                metadata: params.metadata || {},
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('CRITICAL: Failed to write audit log', error, params);

        // Fail-Closed by default.
        // We only allow proceeding if explicitly requested via options AND we are not in a transaction.
        // Transactions (tx) imply strict atomicity, so we never conceal errors there.
        if (options?.allowFailOpen && !tx) {
            console.warn('AUDIT FAILURE IGNORED: Operation proceeding due to allowFailOpen=true override.');
            return;
        }

        // Default: Throw to ensure operation blocks (Fail-Closed)
        throw new Error(`Audit log failure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
