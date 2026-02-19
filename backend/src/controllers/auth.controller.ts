import { Request, Response } from 'express';
import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';
import { logAudit } from '../utils/audit';
import { passwordService } from '../services/password.service';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
    console.error("JWT_SECRET missing in auth controller");
    // We already check in index.ts but this satisfies TS
}

// Helper for constant-time comparison
const DUMMY_HASH = '$2a$10$z.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // 60 chars
const MIN_LOGIN_TIME_MS = 300; // Minimum time to wait before response
import crypto from 'crypto'; // F-006: Required for token hashing

// Helper sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const login = async (req: Request, res: Response) => {
    const start = Date.now();
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // 1. Find User (or simulate find)
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // 2. Validate Password (ALWAYS execute compare to prevent timing attacks)
        // If user is missing, compare against dummy hash
        const targetHash = user?.password || DUMMY_HASH;
        const isValid = await passwordService.compare(password, targetHash);

        // Normalize execution time to mitigate timing attacks on "User Found" vs "User Not Found" lookup
        // Prisma lookup + bcrypt should be roughly dominated by bcrypt.
        // We add a random jitter or fixed floor to mask db query time diffs if any.
        const elapsed = Date.now() - start;
        const remaining = MIN_LOGIN_TIME_MS - elapsed;
        if (remaining > 0) {
            await sleep(remaining);
        }

        // 3. Check Validity (User must exist AND password must match)
        if (!user || !user.password || !isValid) {
            // AUDIT: Log failure if user is resolvable
            if (user) {
                await logAudit({
                    action: 'LOGIN_FAILURE',
                    target: 'User Login',
                    actorId: user.id,
                    actorEmail: user.email,
                    tenantId: user.tenantId,
                    metadata: { reason: 'Invalid Credentials' }
                });
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // AUDIT: Log Success (Fail-Closed: Audit failure blocks login)
        await logAudit({
            action: 'LOGIN_SUCCESS',
            target: 'User Login',
            actorId: user.id,
            actorEmail: user.email,
            tenantId: user.tenantId,
            metadata: { method: 'password' }
        });

        // 4. Generate Token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 5. Set Cookie
        // AUDIT FIX: Use sameSite: 'none' and secure: true for cross-domain production (Vercel <-> Render)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Must be true if sameSite is 'none'
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // 6. Return User (without password/token in body)
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            user: userWithoutPassword,
            // token: token // Removed from body to force cookie usage
        });

    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

import { emailService } from '../services/email.service';

// ... (imports)

// ... (login function)

export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // For security, always return success even if user doesn't exist
        // This prevents email enumeration attacks
        if (!user) {
            return res.json({
                message: 'If the email exists, a reset code has been generated',
            });
        }

        // F-006: Generate cryptographically secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // F-006: Hash the token before storage using SHA-256
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set expiration to 1 hour from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Delete any existing unused tokens for this user
        await prisma.passwordResetToken.deleteMany({
            where: {
                userId: user.id,
                used: false
            }
        });

        // Create new reset token (Store HASH only)
        await prisma.passwordResetToken.create({
            data: {
                tokenHash, // Remediated
                expiresAt,
                userId: user.id
            }
        });

        // Send email using the email service (Send RAW token)
        const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);

        if (emailSent) {
            // Log success but NEVER log the token
            console.log(`[PASSWORD RESET] Email sent to ${email}`);

            // AUDIT: Log Request (Fail-Closed: Audit failure blocks response)
            await logAudit({
                action: 'PASSWORD_RESET_REQUESTED',
                target: `User: ${email}`,
                actorId: user.id,
                actorEmail: user.email,
                tenantId: user.tenantId,
            });

            res.json({
                message: 'If the email exists, a reset code has been sent to your email',
            });
        } else {
            console.error(`[PASSWORD RESET] Failed to send email to ${email}`);
            res.json({
                message: 'If the email exists, a reset code has been generated',
            });
        }

    } catch (error: any) {
        console.error('Password reset request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: 'Email, token, and new password are required' });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired reset token' });
        }

        // F-006: Hash provided token to match stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid reset token by HASH
        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                tokenHash, // Match against hash
                userId: user.id,
                used: false,
                expiresAt: {
                    gt: new Date() // Token must not be expired
                }
            }
        });

        if (!resetToken) {
            return res.status(401).json({ error: 'Invalid or expired reset token' });
        }

        // Hash the new password
        const hashedPassword = await passwordService.hash(newPassword);

        // TRANSACTIONAL MUTATION & AUDIT
        await prisma.$transaction(async (tx) => {
            // Update user password
            await tx.user.update({
                where: { id: user.id },
                data: { password: hashedPassword, lastRevocationAt: new Date() }
            });

            // Mark token as used
            await tx.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true }
            });

            console.log(`[PASSWORD RESET] Password successfully reset for user ${email}`);

            // AUDIT: Log Completion (Fail-Closed)
            await logAudit({
                action: 'PASSWORD_RESET_COMPLETED',
                target: `User: ${user.email}`,
                actorId: user.id,
                actorEmail: user.email,
                tenantId: user.tenantId,
                metadata: { method: 'token' }
            }, tx);
        });

        res.json({ message: 'Password has been reset successfully' });

    } catch (error: any) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = (req as any).user?.id; // From auth middleware

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Validate new password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.password) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidCurrentPassword = await passwordService.compare(currentPassword, user.password);
        if (!isValidCurrentPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await passwordService.hash(newPassword);

        // TRANSACTIONAL MUTATION & AUDIT
        await prisma.$transaction(async (tx) => {
            // Update password
            await tx.user.update({
                where: { id: userId },
                data: { password: hashedPassword, lastRevocationAt: new Date() }
            });

            console.log(`[AUTH] Password changed successfully for user ${userId}`);

            // AUDIT: Log Change (Fail-Closed)
            await logAudit({
                action: 'PASSWORD_CHANGED',
                target: 'User Password Change',
                actorId: userId,
                actorEmail: user.email,
                tenantId: user.tenantId
            }, tx);
        });

        res.json({ message: 'Password changed successfully' });

    } catch (error: any) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        // Revoke token generation by updating lastRevocationAt
        if (userId) {
            await prisma.user.update({
                where: { id: userId },
                data: { lastRevocationAt: new Date() }
            });
        }

        // Clear the HttpOnly cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });

        res.json({ message: 'Logged out' });

    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
