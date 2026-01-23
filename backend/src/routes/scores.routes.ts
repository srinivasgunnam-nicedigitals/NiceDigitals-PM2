import { Router } from 'express';
import { getScores, addScore } from '../controllers/scores.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getScores);
router.post('/', authenticateToken, addScore);

export default router;
