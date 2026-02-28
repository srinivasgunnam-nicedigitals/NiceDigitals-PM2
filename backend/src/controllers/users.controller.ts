import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { passwordService } from '../services/password.service';
import { logAudit } from '../utils/audit';
import { z } from 'zod';

export const createUserSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(100),
    role: z.enum(['ADMIN', 'DESIGNER', 'DEV_MANAGER', 'QA_ENGINEER']),
    avatar: z.string().url().optional()
}).strict();

export const updateUserSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    username: z.string().min(3).max(50).optional(),
    role: z.enum(['ADMIN', 'DESIGNER', 'DEV_MANAGER', 'QA_ENGINEER']).optional(),
    avatar: z.string().url().optional()
}).strict();

export const getUsers = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000); // Safety Cap
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                    avatar: true,
                    tenantId: true
                },
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            prisma.user.count({ where: { tenantId } })
        ]);

        res.json({
            data: users,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * Create User - ADMIN ONLY
 * Enforced by middleware, but double-checked here for safety.
 */
export const addUser = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        // Double check Admin role just in case middleware is bypassed/misconfigured
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Admins only' });
        }

        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        // Validate and parse request body with Zod
        let validated: z.infer<typeof createUserSchema>;
        try {
            validated = createUserSchema.parse(req.body);
        } catch (zodError: any) {
            return res.status(400).json({ error: zodError.errors?.[0]?.message || 'Invalid request body' });
        }

        const { name, email, username, password, role, avatar } = validated;

        let finalUsername = username;
        if (!finalUsername) {
            const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const suffix = Math.floor(1000 + Math.random() * 9000);
            finalUsername = `${base}${suffix}`;
        }

        const hashedPassword = await passwordService.hash(password);

        // Explicitly construct data object to prevent prototype pollution or extra field injection
        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    username: finalUsername,
                    password: hashedPassword,
                    role, // Only Admins can set this, checked above
                    avatar: avatar || null,
                    tenantId
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                    avatar: true,
                    tenantId: true
                }
            });

            await logAudit({
                action: 'USER_CREATE',
                target: `User: ${email}`,
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                tenantId,
                metadata: { createdUserId: user.id, role }
            }, tx);

            return user;
        });

        res.json(newUser);
    } catch (error: any) {
        console.error('Add User Error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
};

/**
 * Delete User - ADMIN ONLY
 */
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Admins only' });
        }
        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.user?.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await prisma.$transaction(async (tx) => {
            const result = await tx.user.deleteMany({
                where: {
                    id,
                    tenantId
                }
            });

            if (result.count === 0) {
                throw new Error('User not found');
            }

            await logAudit({
                action: 'USER_DELETE',
                target: `User ID: ${id}`,
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                tenantId,
                metadata: { deletedUserId: id }
            }, tx);
        });

        res.json({ success: true });
    } catch (error: any) {
        if (error.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Delete User Error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

/**
 * Update User - Self or Admin
 * - Admins can update anyone (including Roles)
 * - Users can update only themselves (Name/Avatar/Email only, NO ROLE)
 */
export const updateUser = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const operatorRole = req.user?.role;
        const operatorId = req.user?.id;
        const { id } = req.params;

        if (!tenantId || !operatorId) return res.status(401).json({ error: 'Unauthorized' });

        // Check permissions
        const isSelf = id === operatorId;
        const isAdmin = operatorRole === 'ADMIN';

        if (!isSelf && !isAdmin) {
            return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
        }

        // Validate and parse request body with Zod
        let parsedBody: z.infer<typeof updateUserSchema>;
        try {
            parsedBody = updateUserSchema.parse(req.body);
        } catch (zodError: any) {
            return res.status(400).json({ error: zodError.errors?.[0]?.message || 'Invalid request body' });
        }

        const { name, email, username, role, avatar } = parsedBody;

        // Build allowed updates
        const updateData: any = {};

        // Name, Username and Avatar: Allowed for Self and Admin
        if (name !== undefined) updateData.name = name;
        if (username !== undefined) updateData.username = username;
        if (avatar !== undefined) updateData.avatar = avatar;

        // Email: Admin Only ? (Per common SaaS rules, usually Admin only or Email Verification required)
        // Original code said "Only admins can change email". Let's stick to that strict rule for now.
        // Or if audit said "Users - Update Self", name/avatar is standard.
        // Let's allow users to update email for now but secure it if needed later.
        // Actually, changing email might require verification. Let's restrict `email` to Admin for safety,
        // OR allow self-change if we trust they own the session.
        // Detailed Audit: "Restricting email changes so that only administrative users can modify...".
        // Conversation 86d38edc confirms: "Restricting email changes so that only administrative users...".
        // SO: Email is ADMIN ONLY.
        if (email !== undefined) {
            if (isAdmin) {
                updateData.email = email;
            } else {
                // User trying to change email -> forbidden or ignored
                // res.status(403) is cleaner
                return res.status(403).json({ error: 'Only admins can change email addresses' });
            }
        }

        // Role: ADMIN ONLY
        if (role !== undefined) {
            if (isAdmin) {
                updateData.role = role;
            } else {
                return res.status(403).json({ error: 'Forbidden: You can cannot change roles' });
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // TRANSACTIONAL MUTATION & AUDIT
        const user = await prisma.$transaction(async (tx) => {
            // Perform Update
            const updatedUser = await tx.user.updateMany({
                where: {
                    id,
                    tenantId
                },
                data: updateData
            });

            if (updatedUser.count === 0) {
                // Throw to abort transaction
                throw new Error('User not found');
            }

            // Return updated user
            const fetchedUser = await tx.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    email: true,
                    role: true,
                    avatar: true,
                    tenantId: true
                }
            });

            if (!fetchedUser) throw new Error('User not found after update');

            // AUDIT: Log Update (Fail-Closed)
            await logAudit({
                action: 'USER_UPDATED',
                target: `User: ${fetchedUser.email}`,
                actorId: operatorId,
                actorEmail: req.user?.email, // Safe per middleware
                tenantId: tenantId,
                metadata: {
                    updatedFields: Object.keys(updateData),
                    targetUserId: id
                }
            }, tx);

            return fetchedUser;
        });

        res.json(user);
    } catch (error: any) {
        console.error('Update User Error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
};

