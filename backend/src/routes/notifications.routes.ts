import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, clearAll, createNotification } from '../controllers/notifications.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.post('/', createNotification); // For testing or admin
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/', clearAll);

export default router;
