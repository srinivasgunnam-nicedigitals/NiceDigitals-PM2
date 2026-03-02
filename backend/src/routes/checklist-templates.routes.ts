import { Router } from 'express';
import * as templateController from '../controllers/checklist-templates.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', templateController.getTemplates);
// Only admins can modify templates
router.post('/', requireAdmin, templateController.createTemplate);
router.patch('/:id', requireAdmin, templateController.updateTemplate);
router.delete('/:id', requireAdmin, templateController.archiveTemplate);

export default router;
