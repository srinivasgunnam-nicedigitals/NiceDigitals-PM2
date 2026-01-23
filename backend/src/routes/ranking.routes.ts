import { Router } from 'express';
import { getRankings } from '../controllers/ranking.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getRankings);

export default router;
