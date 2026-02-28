/**
 * realtime/realtime.ts
 *
 * Socket.io handshake, authentication middleware, and room binding.
 *
 * Auth strategy: HttpOnly cookie
 * ─────────────────────────────────────────────────────────────────
 * The JWT is stored in an HttpOnly cookie ('token') — it is NEVER
 * accessible to JavaScript. When the client connects with
 * `withCredentials: true`, the browser automatically attaches all
 * cookies to the WebSocket upgrade request.
 *
 * We read `socket.handshake.headers.cookie` and parse it manually
 * using the 'cookie' package (already a dependency via cookie-parser).
 *
 * Security model:
 *  - Token parsed from HttpOnly cookie — not from socket.handshake.auth
 *  - Token verified with JWT_SECRET (same as HTTP middleware)
 *  - User fetched from DB: confirms isActive + revocation status
 *  - Socket placed in room `tenant:<tenantId>` — tenant isolation
 *  - No client-provided tenantId ever trusted — always DB-derived
 */

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { parse as parseCookies } from 'cookie';
import { prisma } from '../config/db';
import { realtimeService } from './RealtimeService';
import { logger } from '../config/logger';
import { AuthenticatedSocketData } from './types';

const JWT_SECRET = process.env.JWT_SECRET as string;

export function registerRealtime(io: Server): void {
  // Initialize singleton emitter with the live io instance
  realtimeService.init(io);

  // Production health guard — logs transport-level errors (e.g. ECONNREFUSED,
  // load balancer resets, TLS failures). Does NOT affect active sockets.
  io.engine.on('connection_error', (err: Error & { code?: string; context?: unknown }) => {
    logger.warn(
      { code: err.code, message: err.message },
      'WS: engine connection_error'
    );
  });

  // ── Authentication middleware ──────────────────────────────────────────────
  // Runs on every new socket connection, before the 'connection' event fires.
  io.use(async (socket: Socket, next) => {
    try {
      // Read the raw cookie header sent with the WebSocket upgrade request.
      // The browser sends these automatically when withCredentials: true.
      const rawCookies = socket.handshake.headers.cookie;

      if (!rawCookies) {
        logger.warn({ socketId: socket.id }, 'WS: no cookies in handshake');
        return next(new Error('Unauthorized'));
      }

      // Parse the cookie string into key-value pairs
      const cookies = parseCookies(rawCookies);
      const token = cookies['token']; // Must match cookie name set in auth.controller.ts

      if (!token) {
        logger.warn({ socketId: socket.id }, 'WS: auth cookie missing');
        return next(new Error('Unauthorized'));
      }

      // Verify JWT signature and expiry
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        logger.warn({ socketId: socket.id }, 'WS: invalid or expired token');
        return next(new Error('Unauthorized'));
      }

      // Fetch user from DB — confirms active status and revocation
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, tenantId: true, isActive: true, lastRevocationAt: true },
      });

      if (!user || !user.isActive) {
        logger.warn({ socketId: socket.id, userId: decoded.id }, 'WS: user not found or inactive');
        return next(new Error('Unauthorized'));
      }

      // Token revocation check (mirrors HTTP auth middleware)
      if (user.lastRevocationAt) {
        const revokedAtSeconds = Math.floor(user.lastRevocationAt.getTime() / 1000);
        if (decoded.iat && decoded.iat < revokedAtSeconds) {
          logger.warn({ socketId: socket.id, userId: user.id }, 'WS: session revoked');
          return next(new Error('Unauthorized'));
        }
      }

      // Attach to socket.data — available in all subsequent event handlers
      (socket.data as AuthenticatedSocketData).user = {
        id: user.id,
        tenantId: user.tenantId,
      };

      next();
    } catch (err) {
      logger.error({ err }, 'WS: unexpected error during handshake');
      next(new Error('Unauthorized'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const { id: userId, tenantId } = (socket.data as AuthenticatedSocketData).user;
    const room = `tenant:${tenantId}`;

    socket.join(room);
    logger.debug({ socketId: socket.id, userId, tenantId }, 'WS: client connected and joined room');

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, userId, reason }, 'WS: client disconnected');
    });
  });
}
