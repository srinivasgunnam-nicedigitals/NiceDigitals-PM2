/**
 * useRealtimeInvalidation.ts
 *
 * Connects to the WebSocket server and invalidates React Query caches
 * when the server emits an INVALIDATE event.
 *
 * Design principles:
 *  - No reducers, no context mutation, no cache merging
 *  - Connects only when currentUser exists (post-auth)
 *  - Disconnects cleanly on logout or component unmount
 *  - Uses HttpOnly cookie auth (withCredentials: true) — no token in JS
 *  - Reconnects with exponential backoff (1s → 30s, 10 attempts)
 *  - Returns connection status so UI can show live/reconnecting/offline
 *
 * Mount point: AuthProvider (once only, never in leaf components)
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

type InvalidateKey =
  | 'projects'
  | 'projectStats'
  | 'notifications'
  | 'rankings'
  | 'users';

interface InvalidateEvent {
  type: 'INVALIDATE';
  keys: InvalidateKey[];
}

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

// Strip /api suffix from VITE_API_URL to get the base WebSocket origin
const WS_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ?? '';

export function useRealtimeInvalidation(): { status: RealtimeStatus } {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');

  useEffect(() => {
    // Only connect when a user session exists — no auth = no socket
    if (!currentUser) {
      setStatus('disconnected');
      return;
    }

    // Guard: don't open a second connection (React Strict Mode double-invoke)
    if (socketRef.current?.connected) return;

    setStatus('connecting');

    const socket = io(WS_URL, {
      // HttpOnly cookie is sent automatically by the browser during the
      // WebSocket upgrade handshake. No manual token attachment needed.
      withCredentials: true,

      // Prefer WebSocket from the start; fall back to polling if needed
      transports: ['websocket', 'polling'],

      // Exponential backoff — survives brief server restarts
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,      // Initial delay: 1s
      reconnectionDelayMax: 30_000,  // Max delay: 30s
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      if (import.meta.env.DEV) {
        console.debug('[WS] Connected — tenant session active');
      }
    });

    socket.on('INVALIDATE', (event: InvalidateEvent) => {
      if (import.meta.env.DEV) {
        console.debug('[WS] Invalidating:', event.keys);
      }
      // Declarative invalidation — React Query re-fetches automatically
      event.keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    });

    socket.on('reconnect_attempt', () => {
      setStatus('reconnecting');
    });

    socket.on('reconnect', () => {
      setStatus('connected');
      if (import.meta.env.DEV) {
        console.debug('[WS] Reconnected');
      }
    });

    socket.on('reconnect_failed', () => {
      setStatus('disconnected');
      if (import.meta.env.DEV) {
        console.debug('[WS] Reconnect exhausted');
      }
    });

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        console.debug('[WS] Connection error:', err.message);
      }
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      if (import.meta.env.DEV) {
        console.debug('[WS] Disconnected:', reason);
      }
    });

    // Cleanup: disconnect when user logs out or component unmounts
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  // currentUser.id: reconnect when the user identity changes (login/logout)
  // queryClient: stable reference, included for correctness
  }, [currentUser?.id, queryClient]);

  return { status };
}
