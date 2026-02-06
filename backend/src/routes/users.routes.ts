import { Router } from 'express';
import { getUsers, addUser, deleteUser, updateUser } from '../controllers/users.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get users - All authenticated users can see their team members
router.get('/', authenticateToken, getUsers);

// Create user - ADMIN ONLY
router.post('/', authenticateToken, requireAdmin, addUser);

// Update user - Self update OR Admin update (Logic in controller)
router.patch('/:id', authenticateToken, updateUser);

// Delete user - ADMIN ONLY
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

export default router;


