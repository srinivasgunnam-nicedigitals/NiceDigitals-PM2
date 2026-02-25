import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getActivityFeed } from '../controllers/activity.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getActivityFeed);

export default router;
