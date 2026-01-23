import { Router } from 'express';
import { getUsers, addUser, deleteUser, updateUser } from '../controllers/users.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getUsers);
router.post('/', authenticateToken, addUser);
router.patch('/:id', authenticateToken, updateUser);
router.delete('/:id', authenticateToken, deleteUser);

export default router;

