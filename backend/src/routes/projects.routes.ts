import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import {
    getProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    addComment,
    getProjectHistory,
    getProjectComments
} from '../controllers/projects.controller';

// New secure endpoints
import { advanceStage, recordQAFeedback } from '../controllers/projects.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// CRUD operations
router.get('/', getProjects);
router.get('/:id', getProject);

// Only Admins can CREATE projects (per matrix)
router.post('/', requireAdmin, createProject);

// Updates: Logic in controller (Complex permissions)
router.patch('/:id', updateProject);

// Deletes: ADMIN ONLY
// Deletes: ADMIN ONLY
router.delete('/:id', requireAdmin, deleteProject);

router.get('/:id/history', getProjectHistory);
router.get('/:id/comments', getProjectComments);

router.post('/:id/comments', addComment);

// NEW: Secure stage advancement (server calculates scores)
router.post('/:id/advance-stage', advanceStage);
router.post('/:id/qa-feedback', recordQAFeedback);

export default router;

