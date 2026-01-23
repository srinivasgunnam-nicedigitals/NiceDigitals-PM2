import { Request, Response } from 'express';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';

export const getUsers = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        const users = await prisma.user.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                tenantId: true
            }
        });
        console.log(`[DEBUG] getUsers for tenant ${tenantId}: Found ${users.length} users.`);
        res.json(users);
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const addUser = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        const u = req.body;

        // Validate required fields
        if (!u.email || !u.name || !u.password || !u.role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(u.password, 10);

        // Use Prisma to create. it handles UUID default if ID is missing.
        // If ID is provided (from frontend), it uses it.
        const newUser = await prisma.user.create({
            data: {
                // If u.id is "u-...", Prisma might accept it if schema is String.
                // But better to sanitize or let Backend generate if possible.
                // For now, we spread u but overwrite critial fields.
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar,
                tenantId: tenantId,
                password: hashedPassword
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                tenantId: true
            }
        });

        res.json(newUser);
    } catch (error: any) {
        console.error('Add User Error:', error);
        // Handle Unique Constraint Violation (P2002)
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        const { id } = req.params;

        await prisma.user.deleteMany({
            where: {
                id,
                tenantId
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete User Error:', error);
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const userRole = req.user?.role;

        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        // Only admins can update users
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Only admins can update users' });
        }

        const { id } = req.params;
        const { name, email, role } = req.body;

        // Build update data object with only provided fields
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;

        // Update user only if they belong to the same tenant
        const updatedUser = await prisma.user.updateMany({
            where: {
                id,
                tenantId
            },
            data: updateData
        });

        if (updatedUser.count === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch and return the updated user
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                tenantId: true
            }
        });

        res.json(user);
    } catch (error: any) {
        console.error('Update User Error:', error);
        // Handle Unique Constraint Violation (P2002) for email
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
};

