import { Router } from 'express';
import * as calibrationController from '../controllers/calibration.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/calibration — Calibration report
router.get('/', calibrationController.getCalibrationReport);

// PATCH /api/calibration/:projectId/outcome — Tag actual outcome
router.patch('/:projectId/outcome', calibrationController.setActualOutcome);

export default router;
