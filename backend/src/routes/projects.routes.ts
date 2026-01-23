import { Router } from 'express';
import { getProjects, createProject, updateProject, deleteProject, addComment } from '../controllers/projects.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getProjects);
router.post('/', authenticateToken, createProject);
router.patch('/:id', authenticateToken, updateProject);
router.delete('/:id', authenticateToken, deleteProject);
router.post('/:id/comments', authenticateToken, addComment);

export default router;
