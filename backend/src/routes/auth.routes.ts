import { Router } from 'express';
import { login, requestPasswordReset, resetPassword, changePassword, logout } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

import { rateLimit } from 'express-rate-limit';
import { createLimiterStore } from '../config/limiterStore';

const router = Router();

// Dedicated limiter for login endpoint to prevent brute-force
// Raised from 10 → 100 to support up to 50 users sharing one LAN/NAT IP.
// Still blocks automated brute-force which attempt thousands per window.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 attempts per window from a shared IP
    standardHeaders: true,
    legacyHeaders: false,
    store: createLimiterStore('rl_login'),
    message: { error: 'Too many login attempts, please try again later.' }
});

// Dedicated limiter for password reset endpoints to prevent brute-force
// Raised from 5 → 50 to cover LAN scenario where multiple users may request resets.
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 50, // 50 attempts per shared IP window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: createLimiterStore('rl_reset'),
    message: { error: 'Too many password reset attempts, please try again later.' }
});

router.post('/login', loginLimiter, login);
router.post('/request-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

export default router;
