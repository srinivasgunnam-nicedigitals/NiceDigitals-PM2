import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ProjectStage, Prisma, UserRole } from '@prisma/client';


import * as projectsService from '../services/projects.service';
import {
    createProjectSchema,
    adminUpdateProjectSchema,
    memberUpdateProjectSchema,
    addCommentSchema,
    advanceStageSchema,
    recordQAFeedbackSchema,
    changeDeadlineSchema,
    reassignLeadSchema,
    addTeamMemberSchema,
    updateTeamMemberSchema,
    deleteTeamMemberSchema
} from '../utils/validation';
import { logAudit } from '../utils/audit';
import { AppError } from '../utils/AppError';
import { isBefore, startOfDay } from 'date-fns';

import { sanitizeHtml } from '../utils/sanitize';
import { realtimeService } from '../realtime/RealtimeService';

export const getProjectStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');
        }

        const [upcoming, design, dev, qa, review, completed, delayed] = await Promise.all([
            prisma.project.count({ where: { tenantId, stage: ProjectStage.UPCOMING } }),
            prisma.project.count({ where: { tenantId, stage: ProjectStage.DESIGN } }),
            prisma.project.count({ where: { tenantId, stage: ProjectStage.DEVELOPMENT } }),
            prisma.project.count({ where: { tenantId, stage: ProjectStage.QA } }),
            prisma.project.count({ where: { tenantId, stage: ProjectStage.ADMIN_REVIEW } }),
            prisma.project.count({ where: { tenantId, stage: ProjectStage.COMPLETED } }),
            prisma.project.count({ where: { tenantId, isDelayed: true, stage: { not: ProjectStage.COMPLETED } } }),
        ]);

        res.json({
            upcoming,
            design,
            dev,
            qa,
            review,
            completed,
            delayed,
            totalActive: upcoming + design + dev + qa + review
        });
    } catch (error) {
        next(error);
    }
};

export const getKanban = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');
        }
        const limitPerStage = Math.min(
            parseInt(req.query.limitPerStage as string) || 20,
            50 // Hard ceiling per column
        );
        const board = await projectsService.getKanbanView(tenantId, limitPerStage);
        res.json(board);
    } catch (error) {
        next(error);
    }
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');
        }

        const page = parseInt(req.query.page as string) || 1;
        // 500 is the practical upper bound for the Kanban board view.
        // The paginated Projects Overview always passes an explicit limit (default 50),
        // so raising this ceiling does not affect normal list queries.
        const MAX_LIMIT = 500;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, MAX_LIMIT);
        const skip = (page - 1) * limit;

        // Optional filter params — only applied when present
        const statusFilter = req.query.status as string | undefined;
        const priorityFilter = req.query.priority as string | undefined;
        const clientNameFilter = req.query.clientName as string | undefined;

        const whereClause: Prisma.ProjectWhereInput = {
            tenantId,
            ...(statusFilter && { stage: statusFilter as ProjectStage }),
            ...(priorityFilter && { priority: priorityFilter as any }),
            ...(clientNameFilter && { clientName: clientNameFilter }),
        };

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where: whereClause,
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
                    version: true, // VERSION ENFORCEMENT: Include version in response

                    assignedDesignerId: true,
                    assignedDevManagerId: true,
                    assignedQAId: true,
                    currentDeadline: true,
                    designChecklist: true,
                    devChecklist: true,
                    qaChecklist: true,
                    finalChecklist: true,

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
            prisma.project.count({ where: whereClause })
        ]);

        const today = startOfDay(new Date());

        const safeProjects = projects.map(p => {
            const deadline = p.currentDeadline ? new Date(p.currentDeadline as Date) : new Date(p.overallDeadline);
            const dynamicallyDelayed = p.isDelayed || isBefore(deadline, today);

            return {
                ...p,
                isDelayed: dynamicallyDelayed,
                designChecklist: p.designChecklist,
                devChecklist: p.devChecklist,
                qaChecklist: p.qaChecklist,
                finalChecklist: p.finalChecklist,
                assignedDesigner: p.assignedDesigner && p.assignedDesigner.tenantId === tenantId
                    ? { id: p.assignedDesigner.id, name: p.assignedDesigner.name, avatar: p.assignedDesigner.avatar }
                    : null,
                assignedDevManager: p.assignedDevManager && p.assignedDevManager.tenantId === tenantId
                    ? { id: p.assignedDevManager.id, name: p.assignedDevManager.name, avatar: p.assignedDevManager.avatar }
                    : null,
                assignedQA: p.assignedQA && p.assignedQA.tenantId === tenantId
                    ? { id: p.assignedQA.id, name: p.assignedQA.name, avatar: p.assignedQA.avatar }
                    : null
            };
        });

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
        next(error);
    }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;

        if (!tenantId) {
            throw AppError.unauthorized('Unauthorized', 'NO_TENANT');
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

        // Sanitize & Calculate Delay
        const today = startOfDay(new Date());
        const deadline = project.currentDeadline ? new Date(project.currentDeadline as Date) : new Date(project.overallDeadline);
        const dynamicallyDelayed = project.isDelayed || isBefore(deadline, today);

        const safeProject = {
            ...project,
            isDelayed: dynamicallyDelayed,
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
        next(error);
    }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        if (!tenantId || !userId) {
            throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');
        }

        if (userRole !== 'ADMIN') {
            throw AppError.forbidden('Forbidden: Only Admins can create projects', 'ADMIN_REQUIRED');
        }

        const p = createProjectSchema.parse(req.body);
        const sanitizedScope = sanitizeHtml(p.scope ?? "");

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
                throw AppError.badRequest('One or more assigned users do not belong to your organization', 'CROSS_TENANT_ASSIGNMENT');
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
                    scope: sanitizedScope,
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

        // Emit AFTER response — new project changes list count, stats, and board
        realtimeService.emitInvalidate(tenantId, ['projects', 'kanban', 'projectStats']);
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!tenantId || !userId) {
            throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');
        }

        const { id } = req.params;

        // 1. Fetch Project to verify Ownership / Assignment
        const existing = await prisma.project.findUnique({
            where: { id },
            select: { id: true, tenantId: true, assignedDesignerId: true, assignedDevManagerId: true, assignedQAId: true, stage: true, name: true, version: true, updatedAt: true, assignedDesigner: true, assignedDevManager: true, assignedQA: true }
        });

        if (!existing || existing.tenantId !== tenantId) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        // VERSION-BASED CONFLICT DETECTION (Optimistic Locking)
        // Version is now MANDATORY via Zod schema
        const { version: expectedVersion } = req.body;

        if (existing.version !== expectedVersion) {
            return res.status(409).json({
                error: 'Conflict: Project modified by another user',
                errorCode: 'VERSION_CONFLICT',
                currentVersion: existing.version,
                expectedVersion: expectedVersion,
                updatedAt: existing.updatedAt
            });
        }

        // ===================================
        // PATH A: ADMIN AUTHORITY (Full Access)
        // ===================================
        if (userRole === 'ADMIN') {
            // Strict Schema: Admin Schema
            const updates = adminUpdateProjectSchema.parse(req.body);
            const { newHistoryItem, version: _versionDrop, ...allowedUpdates } = updates;
            const sanitizedUpdates = {
                ...allowedUpdates,
                ...(allowedUpdates.scope !== undefined
                    ? { scope: sanitizeHtml(allowedUpdates.scope) }
                    : {})
            };

            // CROSS-TENANT VALIDATION (Admin Only feature)
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

            // Stage Validation
            if (sanitizedUpdates.stage && sanitizedUpdates.stage !== existing.stage) {
                const allowed = projectsService.VALID_TRANSITIONS[existing.stage] || [];
                if (!allowed.includes(sanitizedUpdates.stage)) {
                    throw AppError.badRequest(`Invalid stage transition: Cannot move from ${existing.stage} to ${sanitizedUpdates.stage}`, 'INVALID_TRANSITION');
                }
            }

            // Admin History Generation
            let historyCreate = undefined;
            const changes: string[] = [];
            if (sanitizedUpdates.assignedDesignerId && sanitizedUpdates.assignedDesignerId !== existing.assignedDesignerId) changes.push('Designer Assigned');
            if (sanitizedUpdates.assignedDevManagerId && sanitizedUpdates.assignedDevManagerId !== existing.assignedDevManagerId) changes.push('Dev Manager Assigned');
            if (sanitizedUpdates.assignedQAId && sanitizedUpdates.assignedQAId !== existing.assignedQAId) changes.push('QA Engineer Assigned');
            if (sanitizedUpdates.scope && sanitizedUpdates.scope !== (existing as any).scope) changes.push('Scope Updated'); // cast if necessary or fetch scope

            if (changes.length > 0 || newHistoryItem) {
                historyCreate = {
                    create: {
                        stage: existing.stage,
                        action: newHistoryItem?.action || changes.join(', ') || 'Project Updated',
                        timestamp: new Date(),
                        userId: userId,
                        projectId: id,
                        tenantId: tenantId,
                        rejectionSnapshot: newHistoryItem?.rejectionSnapshot || undefined
                    }
                };
            }

            // Admin Update Transaction with Atomic Version Increment
            const updatedProject = await prisma.$transaction(async (tx) => {
                // Build update fields dynamically
                const updateFields: string[] = [];
                const updateValues: any[] = [];
                let paramIndex = 1;

                // Add sanitized updates to query
                for (const [key, value] of Object.entries(sanitizedUpdates)) {
                    if (value !== undefined) {
                        if (['designChecklist', 'devChecklist', 'qaChecklist', 'finalChecklist'].includes(key)) {
                            updateFields.push(`"${key}" = $${paramIndex}::jsonb[]`);
                            updateValues.push(Array.isArray(value) ? value.map((x: any) => JSON.stringify(x)) : []);
                        } else if (key === 'priority') {
                            updateFields.push(`"${key}" = $${paramIndex}::"Priority"`);
                            updateValues.push(value);
                        } else if (key === 'stage') {
                            updateFields.push(`"${key}" = $${paramIndex}::"ProjectStage"`);
                            updateValues.push(value);
                        } else if (key === 'overallDeadline' || key === 'currentDeadline') {
                            updateFields.push(`"${key}" = $${paramIndex}::timestamp`);
                            updateValues.push(value);
                        } else {
                            updateFields.push(`"${key}" = $${paramIndex}`);
                            updateValues.push(value);
                        }
                        paramIndex++;
                    }
                }

                // Always increment version and update timestamp
                updateFields.push('version = version + 1');
                updateFields.push('"updatedAt" = NOW()');

                // Add WHERE clause parameters
                const idParam = paramIndex;
                const tenantIdParam = paramIndex + 1;
                const versionParam = paramIndex + 2;
                updateValues.push(id, tenantId, expectedVersion);

                // Execute atomic update
                const result = await tx.$executeRawUnsafe(`
                    UPDATE "Project"
                    SET ${updateFields.join(', ')}
                    WHERE id = $${idParam} AND "tenantId" = $${tenantIdParam} AND version = $${versionParam}
                `, ...updateValues);

                // Verify exactly 1 row affected (version matched)
                if (result !== 1) {
                    throw AppError.conflict(
                        'Project modified by another user',
                        'VERSION_CONFLICT',
                        { expectedVersion }
                    );
                }

                // Create history if needed
                if (historyCreate) {
                    await tx.historyItem.create({
                        data: historyCreate.create
                    });
                }

                // Fetch updated project
                const up = await tx.project.findUnique({
                    where: { id },
                    include: {
                        assignedDesigner: { select: { id: true, name: true, avatar: true, tenantId: true } },
                        assignedDevManager: { select: { id: true, name: true, avatar: true, tenantId: true } },
                        assignedQA: { select: { id: true, name: true, avatar: true, tenantId: true } }
                    }
                });

                if (!up) {
                    throw AppError.notFound('Project not found after update', 'PROJECT_NOT_FOUND');
                }

                await logAudit({
                    action: 'PROJECT_UPDATE_ADMIN',
                    target: `Project: ${up.name}`,
                    actorId: userId,
                    actorEmail: req.user?.email,
                    tenantId,
                    metadata: { projectId: id }
                }, tx);

                return up;
            });

            // Emit AFTER transaction — admin update changes project state on the board
            realtimeService.emitInvalidate(tenantId, ['projects', 'kanban', 'projectStats']);

            return res.json(sanitizeProject(updatedProject, tenantId));
        }

        // ===================================
        // PATH B: MEMBER AUTHORITY (Restricted)
        // ===================================

        // 1. Strict Assignment Check
        const isAssigned =
            existing.assignedDesignerId === userId ||
            existing.assignedDevManagerId === userId ||
            existing.assignedQAId === userId;

        if (!isAssigned) {
            throw AppError.forbidden('Forbidden: You are not assigned to this project', 'NOT_ASSIGNED');
        }

        // 2. Strict Schema: Member Schema
        // This will THROW if frontend sends 'scope', 'name', 'priority', or 'assignments'
        const updates = memberUpdateProjectSchema.parse(req.body);
        const { newHistoryItem, version: _versionDrop, ...allowedUpdates } = updates;

        // 3. Member History (Usually Checklist updates)
        let historyCreate = undefined;
        if (newHistoryItem) {
            historyCreate = {
                create: {
                    stage: existing.stage,
                    action: newHistoryItem.action,
                    timestamp: new Date(),
                    userId: userId,
                    projectId: id,
                    tenantId: tenantId,
                    rejectionSnapshot: newHistoryItem.rejectionSnapshot || undefined
                }
            };
        }

        // Member Update Transaction with Atomic Version Increment
        const updatedProject = await prisma.$transaction(async (tx) => {
            // Build update fields dynamically
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;

            // Add allowed updates to query
            for (const [key, value] of Object.entries(allowedUpdates)) {
                if (value !== undefined) {
                    if (['designChecklist', 'devChecklist', 'qaChecklist', 'finalChecklist'].includes(key)) {
                        updateFields.push(`"${key}" = $${paramIndex}::jsonb[]`);
                        updateValues.push(Array.isArray(value) ? value.map((x: any) => JSON.stringify(x)) : []);
                    } else {
                        updateFields.push(`"${key}" = $${paramIndex}`);
                        updateValues.push(value);
                    }
                    paramIndex++;
                }
            }

            // Always increment version and update timestamp
            updateFields.push('version = version + 1');
            updateFields.push('"updatedAt" = NOW()');

            // Add WHERE clause parameters
            const idParam = paramIndex;
            const tenantIdParam = paramIndex + 1;
            const versionParam = paramIndex + 2;
            updateValues.push(id, tenantId, expectedVersion);

            // Execute atomic update
            const result = await tx.$executeRawUnsafe(`
                UPDATE "Project"
                SET ${updateFields.join(', ')}
                WHERE id = $${idParam} AND "tenantId" = $${tenantIdParam} AND version = $${versionParam}
            `, ...updateValues);

            // Verify exactly 1 row affected (version matched)
            if (result !== 1) {
                throw AppError.conflict(
                    'Project modified by another user',
                    'VERSION_CONFLICT',
                    { expectedVersion }
                );
            }

            // Create history if needed
            if (historyCreate) {
                await tx.historyItem.create({
                    data: historyCreate.create
                });
            }

            // Fetch updated project
            const up = await tx.project.findUnique({
                where: { id },
                include: {
                    assignedDesigner: { select: { id: true, name: true, avatar: true, tenantId: true } },
                    assignedDevManager: { select: { id: true, name: true, avatar: true, tenantId: true } },
                    assignedQA: { select: { id: true, name: true, avatar: true, tenantId: true } }
                }
            });

            if (!up) {
                throw AppError.notFound('Project not found after update', 'PROJECT_NOT_FOUND');
            }

            await logAudit({
                action: 'PROJECT_UPDATE_MEMBER',
                target: `Project: ${up.name}`,
                actorId: userId,
                actorEmail: req.user?.email,
                tenantId,
                metadata: { projectId: id }
            }, tx);

            return up;
        });

        res.json(sanitizeProject(updatedProject, tenantId));

        // Emit AFTER response — member update (checklists etc.) may affect board state
        realtimeService.emitInvalidate(tenantId, ['projects', 'kanban', 'projectStats']);

    } catch (error) {
        next(error);
    }
};

// Helper to reused sanitization logic
const sanitizeProject = (project: any, tenantId: string) => ({
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
});

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const userRole = req.user?.role;

        if (!tenantId) throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');

        // Double check Admin role
        if (userRole !== 'ADMIN') {
            throw AppError.forbidden('Forbidden: Only Admins can delete projects', 'ADMIN_REQUIRED');
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

        // Emit AFTER response — project removed from list, stats, and board
        realtimeService.emitInvalidate(tenantId, ['projects', 'kanban', 'projectStats']);
    } catch (error: any) {
        if (error.message === 'Project not found') {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }
        next(error);
    }
};

export const addComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { text } = addCommentSchema.parse(req.body);
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            throw AppError.unauthorized('Unauthorized: No tenant', 'NO_TENANT');
        }

        // Verify project belongs to tenant
        const project = await prisma.project.findFirst({
            where: { id, tenantId }
        });

        if (!project) {
            throw AppError.notFound('Project not found or access denied', 'PROJECT_NOT_FOUND');
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
        next(error);
    }
};

export const advanceStage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { nextStage, version } = advanceStageSchema.parse(req.body);
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            throw AppError.unauthorized('Unauthorized', 'NO_TENANT');
        }
        // nextStage and version checks handled by Zod

        // RBAC: Only admins or users assigned to the project can advance stage
        const projectForRbac = await prisma.project.findFirst({
            where: { id, tenantId },
            select: { assignedDesignerId: true, assignedDevManagerId: true, assignedQAId: true }
        });

        if (!projectForRbac) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        const isAdmin = req.user?.role === UserRole.ADMIN;
        const isAssigned =
            projectForRbac.assignedDesignerId === userId ||
            projectForRbac.assignedDevManagerId === userId ||
            projectForRbac.assignedQAId === userId;

        if (!isAdmin && !isAssigned) {
            throw AppError.forbidden('You are not assigned to this project', 'NOT_ASSIGNED');
        }

        const updatedProject = await projectsService.advanceProjectStage({
            projectId: id,
            nextStage,
            userId,
            tenantId,
            version // VERSION ENFORCEMENT: Pass to service layer
        });

        res.json(updatedProject);
    } catch (error) {
        next(error);
    }
};

export const recordQAFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { passed, version } = recordQAFeedbackSchema.parse(req.body);
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            throw AppError.unauthorized('Unauthorized', 'NO_TENANT');
        }
        // passed and version checks handled by Zod

        // RBAC: Only admins or users assigned to the project can submit QA feedback
        const projectForRbac = await prisma.project.findFirst({
            where: { id, tenantId },
            select: { assignedDesignerId: true, assignedDevManagerId: true, assignedQAId: true }
        });

        if (!projectForRbac) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        const isAdmin = req.user?.role === UserRole.ADMIN;
        const isAssigned =
            projectForRbac.assignedDesignerId === userId ||
            projectForRbac.assignedDevManagerId === userId ||
            projectForRbac.assignedQAId === userId;

        if (!isAdmin && !isAssigned) {
            throw AppError.forbidden('You are not assigned to this project', 'NOT_ASSIGNED');
        }

        const updatedProject = await projectsService.recordQAFeedback({
            projectId: id,
            passed,
            userId,
            tenantId,
            version // VERSION ENFORCEMENT: Pass to service layer
        });

        res.json(updatedProject);
    } catch (error) {
        next(error);
    }
};

export const getProjectHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

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
        next(error);
    }
};

export const getProjectComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const skip = (page - 1) * limit;

        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

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
        next(error);
    }
};

// GET /api/projects/client-names
// Returns all unique, globally complete client names for the current tenant.
// This is scoped to the tenant and does NOT use pagination, ensuring the
// client filter dropdown in the UI is always complete regardless of page.
export const getClientNames = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) throw AppError.unauthorized('Unauthorized', 'NO_TENANT');

        const result = await prisma.project.findMany({
            where: { tenantId },
            select: { clientName: true },
            distinct: ['clientName'],
            orderBy: { clientName: 'asc' }
        });

        const names = result.map(r => r.clientName).filter(Boolean);
        res.json(names);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/projects/:id/comments/:commentId
// Ownership-only: only the original author may delete their message
export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: projectId, commentId } = req.params;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            throw AppError.unauthorized('Unauthorized', 'NO_TENANT');
        }

        // Fetch the comment — verify tenant isolation first
        const comment = await prisma.comment.findFirst({
            where: { id: commentId, projectId, tenantId }
        });

        if (!comment) {
            throw AppError.notFound('Comment not found', 'COMMENT_NOT_FOUND');
        }

        // OWNERSHIP CHECK: only the original author may delete
        if (comment.userId !== userId) {
            throw AppError.forbidden('You can only delete your own messages', 'NOT_COMMENT_OWNER');
        }

        await prisma.comment.delete({ where: { id: commentId } });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
