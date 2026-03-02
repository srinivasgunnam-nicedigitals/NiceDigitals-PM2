/**
 * LEADERBOARD V3 — Routes
 * 
 * GET /api/leaderboard/designer  — Designer rankings
 * GET /api/leaderboard/dev       — Dev Manager rankings
 * GET /api/leaderboard/qa        — QA Engineer rankings
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getLeaderboardByRole } from '../controllers/leaderboard.controller';

const router = Router();

// All leaderboard routes require authentication
router.use(authenticateToken);

router.get('/:role', getLeaderboardByRole);

export default router;
