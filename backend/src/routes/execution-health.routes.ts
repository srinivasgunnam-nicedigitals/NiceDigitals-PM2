import { Router } from 'express';
import * as executionHealthController from '../controllers/execution-health.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// GET /api/projects/:id/execution-health
router.get('/:id/execution-health', executionHealthController.getExecutionHealth);

export default router;
