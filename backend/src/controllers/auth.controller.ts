import { Request, Response } from 'express';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
    console.error("JWT_SECRET missing in auth controller");
    // We already check in index.ts but this satisfies TS
}

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // 1. Find User using Prisma
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.password) {
            // No password set (e.g. OAuth or invited state), deny.
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 2. Validate Password with Strict Migration Logic
        let isValid = false;

        const isBcryptHash = user.password.startsWith('$2');

        if (isBcryptHash) {
            isValid = await bcrypt.compare(password, user.password);
        } else {
            // LEGACY MIGRATION PATH
            // Strictly compare strings.
            if (user.password === password) {
                isValid = true;

                // FORCE MIGRATION IMMEDIATELY
                const hashedPassword = await bcrypt.hash(password, 10);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                });
                console.log(`[AUTH] SECURITY: Migrated legacy password for user ${user.id}`);
            }
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Generate Token
        // Prisma returns objects with correct casing defined in schema (tenantId)
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

        // 4. Return User (without password) and Token
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            user: userWithoutPassword,
            token
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
                // Don't reveal that user doesn't exist
            });
        }

        // Generate a secure 6-digit token
        const token = Math.floor(100000 + Math.random() * 900000).toString();

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

        // Create new reset token
        await prisma.passwordResetToken.create({
            data: {
                token,
                expiresAt,
                userId: user.id
            }
        });

        // Send email using the email service
        const emailSent = await emailService.sendPasswordResetEmail(email, token);

        if (emailSent) {
            console.log(`[PASSWORD RESET] Email sent to ${email}`);
            res.json({
                message: 'If the email exists, a reset code has been sent to your email',
            });
        } else {
            console.error(`[PASSWORD RESET] Failed to send email to ${email}`);
            // In a real app, maybe return 500, but for security we might still want to show success or a generic error
            // For now, let's return success to not leak implementation details, but log the error
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

        // Find valid reset token
        const resetToken = await prisma.passwordResetToken.findFirst({
            where: {
                token,
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
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        // Mark token as used
        await prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { used: true }
        });

        console.log(`[PASSWORD RESET] Password successfully reset for user ${email}`);

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
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidCurrentPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        console.log(`[AUTH] Password changed successfully for user ${userId}`);

        res.json({ message: 'Password changed successfully' });

    } catch (error: any) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
