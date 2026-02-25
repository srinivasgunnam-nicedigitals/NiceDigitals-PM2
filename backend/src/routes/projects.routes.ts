import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import * as projectsController from '../controllers/projects.controller';
import * as batchController from '../controllers/batch.controller';
import * as phase2aController from '../controllers/phase2a.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Batch operations (must be before /:id routes)
router.post('/batch', batchController.batchUpdateProjects);

// CRUD operations
router.get('/stats', projectsController.getProjectStats);
router.get('/client-names', projectsController.getClientNames);
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
router.delete('/:id/comments/:commentId', projectsController.deleteComment);

// Secure stage advancement (server calculates scores)
router.post('/:id/advance-stage', projectsController.advanceStage);
router.post('/:id/qa-feedback', projectsController.recordQAFeedback);

// Phase 2A: Admin deadline modification
router.patch('/:id/change-deadline', phase2aController.changeDeadline);

// Phase 2A: Admin lead reassignment
router.patch('/:id/reassign-lead', phase2aController.reassignLead);

// Phase 2A: Team member operations
router.get('/:id/team-members', phase2aController.getTeamMembers);
router.post('/:id/team-members', phase2aController.addTeamMember);
router.patch('/:id/team-members/:memberId', phase2aController.updateTeamMember);
router.delete('/:id/team-members/:memberId', phase2aController.deleteTeamMember);

export default router;
