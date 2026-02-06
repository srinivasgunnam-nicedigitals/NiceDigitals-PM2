import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ProjectStage } from '@prisma/client';

import * as projectsService from '../services/projects.service';
import { createProjectSchema, updateProjectSchema, addCommentSchema, advanceStageSchema, recordQAFeedbackSchema } from '../utils/validation';
import { logAudit } from '../utils/audit';

export const getProjects = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const MAX_LIMIT = 100;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, MAX_LIMIT);
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where: { tenantId },
                // Optimized for list view: Exclude heavy relations
                select: {
                    id: true,
                    name: true,
                    clientName: true,
                    priority: true,
                    stage: true,
                    overallDeadline: true,
                    isDelayed: true,
                    createdAt: true,
                    tenantId: true,

                    // Relations (Summary only)
                    assignedDesignerId: true,
                    assignedDevManagerId: true,
                    assignedQAId: true,

                    assignedDesigner: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    },
                    assignedDevManager: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    },
                    assignedQA: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.project.count({ where: { tenantId } })
        ]);

        const safeProjects = projects.map(p => ({
            ...p,
            assignedDesigner: p.assignedDesigner && p.assignedDesigner.tenantId === tenantId
                ? { id: p.assignedDesigner.id, name: p.assignedDesigner.name, avatar: p.assignedDesigner.avatar }
                : null,
            assignedDevManager: p.assignedDevManager && p.assignedDevManager.tenantId === tenantId
                ? { id: p.assignedDevManager.id, name: p.assignedDevManager.name, avatar: p.assignedDevManager.avatar }
                : null,
            assignedQA: p.assignedQA && p.assignedQA.tenantId === tenantId
                ? { id: p.assignedQA.id, name: p.assignedQA.name, avatar: p.assignedQA.avatar }
                : null
        }));

        res.json({
            data: safeProjects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

export const getProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;

        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await prisma.project.findUnique({
            where: { id, tenantId },
            include: {
                assignedDesigner: {
                    select: { id: true, name: true, avatar: true, tenantId: true }
                },
                assignedDevManager: {
                    select: { id: true, name: true, avatar: true, tenantId: true }
                },
                assignedQA: {
                    select: { id: true, name: true, avatar: true, tenantId: true }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Sanitize
        const safeProject = {
            ...project,
            assignedDesigner: project.assignedDesigner && project.assignedDesigner.tenantId === tenantId
                ? { id: project.assignedDesigner.id, name: project.assignedDesigner.name, avatar: project.assignedDesigner.avatar }
                : null,
            assignedDevManager: project.assignedDevManager && project.assignedDevManager.tenantId === tenantId
                ? { id: project.assignedDevManager.id, name: project.assignedDevManager.name, avatar: project.assignedDevManager.avatar }
                : null,
            assignedQA: project.assignedQA && project.assignedQA.tenantId === tenantId
                ? { id: project.assignedQA.id, name: project.assignedQA.name, avatar: project.assignedQA.avatar }
                : null
        };

        res.json(safeProject);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

export const createProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        if (!tenantId || !userId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Only Admins can create projects' });
        }

        const p = createProjectSchema.parse(req.body);

        // CROSS-TENANT VALIDATION (CRITICAL FIXED)
        const assignmentsToCheck = [p.assignedDesignerId, p.assignedDevManagerId, p.assignedQAId].filter(id => id);
        if (assignmentsToCheck.length > 0) {
            const count = await prisma.user.count({
                where: {
                    id: { in: assignmentsToCheck as string[] },
                    tenantId: tenantId // MUST match requester's tenant
                }
            });
            if (count !== assignmentsToCheck.length) {
                return res.status(400).json({ error: 'One or more assigned users do not belong to your organization' });
            }
        }

        // SERVER-SIDE History Generation
        const initialHistory = {
            create: {
                stage: ProjectStage.UPCOMING,
                action: 'Project Created',
                timestamp: new Date(),
                userId: userId,
                tenantId: tenantId
            }
        };

        // TRANSACTIONAL MUTATION & AUDIT (CRITICAL FIXED)
        const newProject = await prisma.$transaction(async (tx) => {
            const project = await tx.project.create({
                data: {
                    // Do NOT trust p.id, generate UUID by default (Prisma)
                    name: p.name,
                    clientName: p.clientName,
                    scope: p.scope ?? "",
                    priority: p.priority,
                    stage: ProjectStage.UPCOMING, // Enforce start stage
                    overallDeadline: p.overallDeadline,
                    currentDeadline: p.currentDeadline ?? null,

                    // Assignments (Validated above)
                    assignedDesignerId: p.assignedDesignerId ?? null,
                    assignedDevManagerId: p.assignedDevManagerId ?? null,
                    assignedQAId: p.assignedQAId ?? null,

                    // Checklists
                    designChecklist: p.designChecklist ?? [],
                    devChecklist: p.devChecklist ?? [],
                    qaChecklist: p.qaChecklist ?? [],
                    finalChecklist: p.finalChecklist ?? [],

                    isDelayed: false,
                    qaFailCount: 0,

                    // Server-generated timestamps
                    createdAt: new Date(),
                    completedAt: null,

                    tenantId: tenantId,

                    // Create initial history item
                    history: initialHistory
                },
                include: {
                    assignedDesigner: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    },
                    assignedDevManager: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    },
                    assignedQA: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    }
                }
            });

            await logAudit({
                action: 'PROJECT_CREATE',
                target: `Project: ${project.name}`,
                actorId: userId,
                actorEmail: req.user?.email, // Optional, safe if undefined
                tenantId,
                metadata: { projectId: project.id }
            }, tx); // Pass transaction client

            return project;
        });

        const safeProject = {
            ...newProject,
            assignedDesigner: newProject.assignedDesigner && newProject.assignedDesigner.tenantId === tenantId
                ? { id: newProject.assignedDesigner.id, name: newProject.assignedDesigner.name, avatar: newProject.assignedDesigner.avatar }
                : null,
            assignedDevManager: newProject.assignedDevManager && newProject.assignedDevManager.tenantId === tenantId
                ? { id: newProject.assignedDevManager.id, name: newProject.assignedDevManager.name, avatar: newProject.assignedDevManager.avatar }
                : null,
            assignedQA: newProject.assignedQA && newProject.assignedQA.tenantId === tenantId
                ? { id: newProject.assignedQA.id, name: newProject.assignedQA.name, avatar: newProject.assignedQA.avatar }
                : null
        };

        res.json(safeProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!tenantId || !userId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const { id } = req.params;
        const updates = updateProjectSchema.parse(req.body);
        const { newHistoryItem, ...allowedUpdates } = updates;

        // 1. Fetch Project to verify Ownership / Assignment
        const existing = await prisma.project.findUnique({
            where: { id },
            select: { id: true, tenantId: true, assignedDesignerId: true, assignedDevManagerId: true, assignedQAId: true, stage: true }
        });

        if (!existing || existing.tenantId !== tenantId) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // 2. Access Control Logic
        const isAdmin = userRole === 'ADMIN';
        const isAssigned =
            existing.assignedDesignerId === userId ||
            existing.assignedDevManagerId === userId ||
            existing.assignedQAId === userId;

        if (!isAdmin && !isAssigned) {
            return res.status(403).json({ error: 'Forbidden: You are not assigned to this project' });
        }

        // 3. Assignment Mutation Guards
        if (allowedUpdates.assignedDesignerId || allowedUpdates.assignedDevManagerId || allowedUpdates.assignedQAId) {
            if (!isAdmin) {
                return res.status(403).json({ error: 'Forbidden: Only Admins can reassign members' });
            }

            // CROSS-TENANT VALIDATION (CRITICAL FIXED)
            const assignmentsToCheck = [allowedUpdates.assignedDesignerId, allowedUpdates.assignedDevManagerId, allowedUpdates.assignedQAId].filter(id => id);
            if (assignmentsToCheck.length > 0) {
                const count = await prisma.user.count({
                    where: {
                        id: { in: assignmentsToCheck as string[] },
                        tenantId: tenantId
                    }
                });
                if (count !== assignmentsToCheck.length) {
                    return res.status(400).json({ error: 'One or more assigned users do not belong to your organization' });
                }
            }
        }

        // B3: Validate Stage Transition
        if (allowedUpdates.stage && allowedUpdates.stage !== existing.stage) {
            const allowed = projectsService.VALID_TRANSITIONS[existing.stage] || [];
            if (!allowed.includes(allowedUpdates.stage)) {
                return res.status(400).json({
                    error: `Invalid stage transition: Cannot move from ${existing.stage} to ${allowedUpdates.stage}`
                });
            }
        }

        // 4. Server-Side History Generation
        let historyCreate = undefined;
        const changes: string[] = [];
        if (allowedUpdates.assignedDesignerId && allowedUpdates.assignedDesignerId !== existing.assignedDesignerId) changes.push('Designer Assigned');
        if (allowedUpdates.assignedDevManagerId && allowedUpdates.assignedDevManagerId !== existing.assignedDevManagerId) changes.push('Dev Manager Assigned');
        if (allowedUpdates.assignedQAId && allowedUpdates.assignedQAId !== existing.assignedQAId) changes.push('QA Engineer Assigned');

        if (changes.length > 0) {
            historyCreate = {
                create: {
                    stage: existing.stage,
                    action: changes.join(', '),
                    timestamp: new Date(),
                    userId: userId,
                    tenantId: tenantId
                }
            };
        }

        // TRANSACTIONAL MUTATION & AUDIT (CRITICAL FIXED)
        const updatedProject = await prisma.$transaction(async (tx) => {
            const up = await tx.project.update({
                where: { id },
                data: {
                    ...allowedUpdates,
                    history: historyCreate
                },
                include: {
                    assignedDesigner: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    },
                    assignedDevManager: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    },
                    assignedQA: {
                        select: { id: true, name: true, avatar: true, tenantId: true }
                    }
                }
            });

            await logAudit({
                action: 'PROJECT_UPDATE',
                target: `Project: ${up.name}`,
                actorId: userId,
                actorEmail: req.user?.email,
                tenantId,
                metadata: { projectId: id, updates: allowedUpdates }
            }, tx); // Pass transaction

            return up;
        });

        const safeProject = {
            ...updatedProject,
            assignedDesigner: updatedProject.assignedDesigner && updatedProject.assignedDesigner.tenantId === tenantId
                ? { id: updatedProject.assignedDesigner.id, name: updatedProject.assignedDesigner.name, avatar: updatedProject.assignedDesigner.avatar }
                : null,
            assignedDevManager: updatedProject.assignedDevManager && updatedProject.assignedDevManager.tenantId === tenantId
                ? { id: updatedProject.assignedDevManager.id, name: updatedProject.assignedDevManager.name, avatar: updatedProject.assignedDevManager.avatar }
                : null,
            assignedQA: updatedProject.assignedQA && updatedProject.assignedQA.tenantId === tenantId
                ? { id: updatedProject.assignedQA.id, name: updatedProject.assignedQA.name, avatar: updatedProject.assignedQA.avatar }
                : null
        };

        res.json(safeProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const userRole = req.user?.role;

        if (!tenantId) return res.status(401).json({ error: 'Unauthorized: No tenant' });

        // Double check Admin role
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden: Only Admins can delete projects' });
        }

        const { id } = req.params;

        // TRANSACTIONAL MUTATION & AUDIT (CRITICAL FIXED)
        await prisma.$transaction(async (tx) => {
            const result = await tx.project.deleteMany({
                where: {
                    id,
                    tenantId
                }
            });

            if (result.count === 0) {
                // Throwing inside transaction aborts it.
                // We need to catch this specific case if we want to return 404,
                // but since we are modifying control flow, we can just throw specific error
                throw new Error('Project not found');
            }

            await logAudit({
                action: 'PROJECT_DELETE',
                target: `Project ID: ${id}`,
                actorId: req.user!.id,
                actorEmail: req.user!.email,
                tenantId,
                metadata: { deletedProjectId: id }
            }, tx);
        });

        res.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Project not found') {
            return res.status(404).json({ error: 'Project not found' });
        }
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text } = addCommentSchema.parse(req.body);
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        // Validation ensures userId is present (auth middleware)
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const newComment = await prisma.comment.create({
            data: {
                text,
                userId, // Safe: From Auth Token
                projectId: id,
                timestamp: new Date().toISOString(), // Safe: Server generated
                tenantId
            }
        });

        res.json(newComment);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

/**
 * NEW SECURE ENDPOINT: Advance project stage
 * Server calculates all scores - client cannot influence
 */
export const advanceStage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nextStage } = advanceStageSchema.parse(req.body);
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // nextStage check handled by Zod


        const updatedProject = await projectsService.advanceProjectStage({
            projectId: id,
            nextStage,
            userId,
            tenantId
        });

        res.json(updatedProject);
    } catch (error: any) {
        console.error('Advance stage error:', error);
        res.status(500).json({ error: error.message || 'Failed to advance stage' });
    }
};

/**
 * NEW SECURE ENDPOINT: Record QA feedback
 * Server calculates penalties/bonuses - client cannot influence
 */
export const recordQAFeedback = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { passed } = recordQAFeedbackSchema.parse(req.body);
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // passed check handled by Zod


        const updatedProject = await projectsService.recordQAFeedback({
            projectId: id,
            passed,
            userId,
            tenantId
        });

        res.json(updatedProject);
    } catch (error: any) {
        console.error('QA feedback error:', error);
        res.status(500).json({ error: error.message || 'Failed to record QA feedback' });
    }
};

export const getProjectHistory = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

        const [history, total] = await Promise.all([
            prisma.historyItem.findMany({
                where: { projectId: id, tenantId },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            prisma.historyItem.count({ where: { projectId: id, tenantId } })
        ]);

        res.json({
            data: history,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
};

export const getProjectComments = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
                where: { projectId: id, tenantId },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            prisma.comment.count({ where: { projectId: id, tenantId } })
        ]);

        res.json({
            data: comments,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};
