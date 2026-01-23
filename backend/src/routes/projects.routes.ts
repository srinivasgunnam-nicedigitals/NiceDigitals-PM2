import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
    getProjects,
    createProject,
    updateProject,
    deleteProject,
    addComment
} from '../controllers/projects.controller';

// New secure endpoints
import { advanceStage, recordQAFeedback } from '../controllers/projects.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// CRUD operations
router.get('/', getProjects);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/comments', addComment);

// NEW: Secure stage advancement (server calculates scores)
router.post('/:id/advance-stage', advanceStage);
router.post('/:id/qa-feedback', recordQAFeedback);

export default router;
