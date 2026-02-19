import { Router } from 'express';
import { login, requestPasswordReset, resetPassword, changePassword, logout } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

import { rateLimit } from 'express-rate-limit';

const router = Router();

// Dedicated limiter for login endpoint to prevent brute-force
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' }
});

// Dedicated limiter for password reset endpoints to prevent brute-force
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Strict limit: 5 attempts
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many password reset attempts, please try again later.' }
});

router.post('/login', loginLimiter, login);
router.post('/request-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

export default router;
