import { Request, Response } from 'express';
import { prisma } from '../config/db';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.sendStatus(401);

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        
        await prisma.notification.updateMany({
            where: { id, userId }, // Ensure ownership
            data: { read: true }
        });

        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

export const clearAll = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        await prisma.notification.deleteMany({
            where: { userId }
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

// Internal usage mainly, but exposed if needed (e.g. from admin panel)
export const createNotification = async (req: Request, res: Response) => {
    try {
        const { title, message, type, userId } = req.body;
        const tenantId = req.user?.tenantId;
        const role = req.user?.role;

        if (!tenantId || !role) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Admins only' });
        }

        if (!title || !message || !type || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const targetUser = await prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: { id: true }
        });

        if (!targetUser) {
            return res.status(400).json({ error: 'Target user is invalid for this tenant' });
        }

        const notif = await prisma.notification.create({
            data: {
                title,
                message,
                type,
                userId: targetUser.id,
                tenantId
            }
        });
        res.json(notif);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};
