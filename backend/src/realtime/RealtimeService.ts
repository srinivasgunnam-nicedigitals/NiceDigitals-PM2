/**
 * RealtimeService.ts
 *
 * Singleton emitter abstraction — the ONLY place that touches socket.io.
 *
 * Rules:
 *  - Controllers never import this directly (use service layer)
 *  - io is injected once at startup, never re-assigned
 *  - All emissions are namespaced by tenantId (room isolation)
 *  - Emit AFTER transaction commit, NEVER inside a transaction block
 */

import { Server } from 'socket.io';
import { InvalidateKey, InvalidateEvent } from './types';
import { logger } from '../config/logger';

class RealtimeService {
  private io: Server | null = null;

  /**
   * Initialize the service with the Socket.io server instance.
   * Must be called once at startup before any emissions.
   */
  init(io: Server): void {
    this.io = io;
    logger.info('RealtimeService initialized');
  }

  /**
   * Emit an INVALIDATE event to all sockets in the tenant's room.
   * Safe to call with no active sockets — rooms with zero members are no-ops.
   *
   * @param tenantId  Identifies the target room: `tenant:<tenantId>`
   * @param keys      Which React Query cache keys to invalidate on the client
   */
  emitInvalidate(tenantId: string, keys: InvalidateKey[]): void {
    if (!this.io) {
      // Service not yet initialized — safe to skip (e.g. during tests or startup)
      logger.warn({ tenantId, keys }, 'RealtimeService.emitInvalidate called before init');
      return;
    }

    const event: InvalidateEvent = { type: 'INVALIDATE', keys };

    this.io
      .to(`tenant:${tenantId}`)
      .emit('INVALIDATE', event);

    logger.debug({ tenantId, keys }, 'Realtime invalidation emitted');
  }

  /**
   * Check whether the service is ready to emit.
   * Useful in health checks.
   */
  get isReady(): boolean {
    return this.io !== null;
  }
}

// Export a module-level singleton — import this everywhere you need to emit
export const realtimeService = new RealtimeService();
