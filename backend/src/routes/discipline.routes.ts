import { Router } from 'express';
import * as disciplineController from '../controllers/discipline.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

// User's own discipline snapshot
router.get('/me', disciplineController.getMyDiscipline);

// Admin-only endpoints
router.get('/team', requireAdmin, disciplineController.getTeamDiscipline);
router.get('/debug/:userId', requireAdmin, disciplineController.getDebugDiscipline);
router.get('/users/:userId', requireAdmin, disciplineController.getUserDiscipline);
router.post('/trigger', requireAdmin, disciplineController.triggerComputation);

export default router;
