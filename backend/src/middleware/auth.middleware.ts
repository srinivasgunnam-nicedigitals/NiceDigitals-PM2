import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
                tenantId: string;
                email: string;
            };
        }
    }
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET is not defined.");
    // In strict production, we might process.exit(1), but for now logging error is sufficient as verify will fail.
}

import { prisma } from '../config/db';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    let token = req.cookies?.token;

    // Fallback to Header
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    }

    if (!token) {
        return res.sendStatus(401);
    }

    // Verify Information
    jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
        if (err) {
            return res.sendStatus(403);
        }

        try {
            // HIGH SEVERITY FIX: Verify User Status & Revocation
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true, tenantId: true, email: true, isActive: true, lastRevocationAt: true }
            });

            if (!user) {
                return res.status(401).json({ error: 'User validation failed' });
            }

            if (!user.isActive) {
                return res.status(401).json({ error: 'Account disabled' });
            }

            // Check Revocation (RevokedAt vs Token IssuedAt)
            // decoded.iat is in seconds, Date.getTime() is in ms
            if (user.lastRevocationAt) {
                const revokedAtSeconds = Math.floor(user.lastRevocationAt.getTime() / 1000);
                if (decoded.iat && decoded.iat < revokedAtSeconds) {
                    return res.status(401).json({ error: 'Session revoked' });
                }
            }

            // Enforce current role (Fixes Role Change privilege escalation)
            if (user.role !== decoded.role) {
                // Determine if we should allow or block. safest is block.
                // But if they access a resource allowed for both, maybe ok?
                // Strict: Block. Force re-login to get new token with new role.
                return res.status(403).json({ error: 'Role mismatch, please login again' });
            }

            req.user = user;
            next();
        } catch (dbError) {
            console.error('Auth DB Error:', dbError);
            return res.sendStatus(500);
        }
    });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    next();
};

export const requireAuth = authenticateToken;

