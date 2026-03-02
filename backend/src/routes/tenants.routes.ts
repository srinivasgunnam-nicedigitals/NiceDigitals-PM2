import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { getSchedulingConfig, updateSchedulingConfig } from '../controllers/tenants.controller';

const router = Router();

// Strict guard: Admin only endpoints
router.use(requireAuth);
router.use(requireAdmin);

// Scheduling Config Layer (Track B Governance)
router.get('/:tenantId/scheduling-config', getSchedulingConfig);
router.put('/:tenantId/scheduling-config', updateSchedulingConfig);

export default router;
