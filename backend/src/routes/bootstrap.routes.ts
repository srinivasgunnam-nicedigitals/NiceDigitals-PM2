import { Router } from 'express';
import { getBootstrapData } from '../controllers/bootstrap.controller';

const router = Router();

import { authenticateToken } from '../middleware/auth.middleware';

router.get('/', authenticateToken, getBootstrapData);

export default router;
