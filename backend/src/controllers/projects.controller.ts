import { Request, Response } from 'express';
import { prisma } from '../config/db';
import * as projectsService from '../services/projects.service';

export const getProjects = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where: { tenantId },
                include: {
                    comments: true,
                    history: true,
                    assignedDesigner: true,
                    assignedDevManager: true,
                    assignedQA: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.project.count({ where: { tenantId } })
        ]);

        res.json({
            data: projects,
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

export const createProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const p = req.body;

        const newProject = await prisma.project.create({
            data: {
                id: p.id,
                name: p.name,
                clientName: p.clientName,
                scope: p.scope,
                priority: p.priority,
                stage: p.stage,
                overallDeadline: p.overallDeadline,
                currentDeadline: p.currentDeadline,
                assignedDesignerId: p.assignedDesignerId || null,
                assignedDevManagerId: p.assignedDevManagerId || null,
                assignedQAId: p.assignedQAId || null,
                designChecklist: p.designChecklist || [],
                devChecklist: p.devChecklist || [],
                qaChecklist: p.qaChecklist || [],
                finalChecklist: p.finalChecklist || [],
                isDelayed: p.isDelayed || false,
                qaFailCount: p.qaFailCount || 0,
                createdAt: p.createdAt,
                completedAt: p.completedAt,
                tenantId: tenantId,
                history: p.history && p.history.length > 0 ? {
                    create: p.history.map((h: any) => ({
                        id: `h-${Date.now()}-${Math.random()}`,
                        stage: h.stage,
                        action: h.action,
                        timestamp: h.timestamp,
                        userId: h.userId,
                        tenantId: tenantId
                    }))
                } : undefined
            },
            include: {
                comments: true,
                history: true,
                assignedDesigner: true,
                assignedDevManager: true,
                assignedQA: true
            }
        });

        res.json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const { id } = req.params;
        const updates = req.body;
        const { history, comments, newHistoryItem, ...scalarUpdates } = updates;

        const existing = await prisma.project.findFirst({
            where: { id, tenantId }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const historyCreate = newHistoryItem ? {
            create: {
                id: `h-${Date.now()}-${Math.random()}`,
                stage: newHistoryItem.stage,
                action: newHistoryItem.action,
                timestamp: newHistoryItem.timestamp,
                userId: newHistoryItem.userId,
                rejectionSnapshot: newHistoryItem.rejectionSnapshot || undefined,
                tenantId: tenantId
            }
        } : undefined;

        const updatedProject = await prisma.project.update({
            where: { id },
            data: {
                ...scalarUpdates,
                history: historyCreate
            },
            include: {
                comments: true,
                history: true,
                assignedDesigner: true,
                assignedDevManager: true,
                assignedQA: true
            }
        });

        res.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant' });
        }

        const { id } = req.params;

        const result = await prisma.project.deleteMany({
            where: {
                id,
                tenantId
            }
        });

        if (result.count === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { text, userId, id: commentId, timestamp } = req.body;
        const tenantId = req.user?.tenantId;

        if (!tenantId) {
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
                id: commentId || `c-${Date.now()}`,
                text,
                userId,
                projectId: id,
                timestamp: timestamp || new Date().toISOString(),
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
        const { nextStage } = req.body;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!nextStage) {
            return res.status(400).json({ error: 'nextStage is required' });
        }

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
        const { passed } = req.body;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (typeof passed !== 'boolean') {
            return res.status(400).json({ error: 'passed (boolean) is required' });
        }

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
