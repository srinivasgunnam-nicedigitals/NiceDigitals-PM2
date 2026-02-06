import { Router } from 'express';
import { login, requestPasswordReset, resetPassword, changePassword } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

import { rateLimit } from 'express-rate-limit';

const router = Router();

// Dedicated limiter for password reset endpoints to prevent brute-force
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Strict limit: 5 attempts
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many password reset attempts, please try again later.' }
});

router.post('/login', login);
router.post('/request-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/change-password', authenticateToken, changePassword);

export default router;
