/**
 * realtime/types.ts
 *
 * Strict type contract for all real-time invalidation events.
 * Using a union type prevents free-form strings and ensures
 * every emitted key maps to a known React Query cache key.
 */

export type InvalidateKey =
  | 'projects'
  | 'kanban'
  | 'projectStats'
  | 'notifications'
  | 'rankings'
  | 'users';

export interface InvalidateEvent {
  type: 'INVALIDATE';
  keys: InvalidateKey[];
}

// Socket.io data attached to each socket after handshake
export interface AuthenticatedSocketData {
  user: {
    id: string;
    tenantId: string;
  };
}
