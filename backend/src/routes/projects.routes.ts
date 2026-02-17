import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import * as projectsController from '../controllers/projects.controller';
import * as batchController from '../controllers/batch.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Batch operations (must be before /:id routes)
router.post('/batch', batchController.batchUpdateProjects);

// CRUD operations
router.get('/', projectsController.getProjects);
router.get('/:id', projectsController.getProject);

// Only Admins can CREATE projects
router.post('/', requireAdmin, projectsController.createProject);

// Updates: Logic in controller (Complex permissions)
router.patch('/:id', projectsController.updateProject);

// Deletes: ADMIN ONLY
router.delete('/:id', requireAdmin, projectsController.deleteProject);

// History and comments
router.get('/:id/history', projectsController.getProjectHistory);
router.get('/:id/comments', projectsController.getProjectComments);
router.post('/:id/comments', projectsController.addComment);

// Secure stage advancement (server calculates scores)
router.post('/:id/advance-stage', projectsController.advanceStage);
router.post('/:id/qa-feedback', projectsController.recordQAFeedback);

export default router;
