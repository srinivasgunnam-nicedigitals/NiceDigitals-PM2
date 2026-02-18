import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { UserRole, TeamLeadRole } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { logAudit } from '../utils/audit';
import {
    changeDeadlineSchema,
    reassignLeadSchema,
    addTeamMemberSchema,
    updateTeamMemberSchema,
    deleteTeamMemberSchema
} from '../utils/validation';

/**
 * PHASE 2A ENDPOINTS
 * 
 * All endpoints follow atomic version discipline:
 * - NO pre-check version comparison
 * - Single atomic WHERE id AND tenantId AND version
 * - Row count validation
 * - 409 with updatedAt on conflict
 * - Audit log inside transaction
 */

/**
 * PATCH /api/projects/:id/change-deadline
 * 
 * Admin-only deadline modification with mandatory justification
 */
export const changeDeadline = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // RBAC: Admin only
        if (userRole !== UserRole.ADMIN) {
            throw AppError.forbidden('Only admins can modify deadlines', 'ADMIN_ONLY');
        }

        // Validate request body
        const validated = changeDeadlineSchema.parse(req.body);
        const { newDeadline, justification, version } = validated;

        // Validate future date
        const deadlineDate = new Date(newDeadline);
        if (deadlineDate <= new Date()) {
            throw AppError.badRequest('Deadline must be in the future', 'INVALID_DEADLINE');
        }

        // Atomic update with version guard (NO PRE-CHECK)
        const result = await prisma.$transaction(async (tx) => {
            // Fetch old deadline for audit log
            const existing = await tx.project.findUnique({
                where: { id },
                select: { overallDeadline: true, tenantId: true }
            });

            if (!existing || existing.tenantId !== tenantId) {
                throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
            }

            // ATOMIC UPDATE: Single statement with version guard
            const updateResult = await tx.$executeRaw`
                UPDATE "Project"
                SET "overallDeadline" = ${deadlineDate}::timestamp,
                    version = version + 1,
                    "updatedAt" = NOW()
                WHERE id = ${id}::uuid 
                  AND "tenantId" = ${tenantId}
                  AND version = ${version}
            `;

            // Validate row count
            if (updateResult !== 1) {
                // Fetch current state for 409 response
                const current = await tx.project.findUnique({
                    where: { id },
                    select: { version: true, updatedAt: true }
                });

                throw AppError.conflict('Version conflict', 'VERSION_CONFLICT', {
                    currentVersion: current?.version,
                    expectedVersion: version,
                    updatedAt: current?.updatedAt
                });
            }

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'DEADLINE_CHANGED',
                    target: `Project ${id}`,
                    actorId: userId!,
                    actorEmail: req.user?.email || '',
                    tenantId: tenantId!,
                    metadata: {
                        oldDeadline: existing.overallDeadline,
                        newDeadline: deadlineDate,
                        justification
                    }
                }
            });

            // Return updated project
            return tx.project.findUnique({ where: { id } });
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/projects/:id/reassign-lead
 * 
 * Admin-only lead reassignment (Design/Dev/QA)
 */
export const reassignLead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // RBAC: Admin only
        if (userRole !== UserRole.ADMIN) {
            throw AppError.forbidden('Only admins can reassign leads', 'ADMIN_ONLY');
        }

        // Validate request body
        const validated = reassignLeadSchema.parse(req.body);
        const { role, userId: newUserId, version } = validated;

        // Validate new user exists and belongs to tenant
        const newUser = await prisma.user.findFirst({
            where: { id: newUserId, tenantId }
        });

        if (!newUser) {
            throw AppError.badRequest('User not found or not in same tenant', 'INVALID_USER');
        }

        // Atomic update with version guard (NO PRE-CHECK)
        const result = await prisma.$transaction(async (tx) => {
            // Fetch previous assignment for audit log
            const existing = await tx.project.findUnique({
                where: { id },
                select: {
                    tenantId: true,
                    assignedDesignerId: true,
                    assignedDevManagerId: true,
                    assignedQAId: true
                }
            });

            if (!existing || existing.tenantId !== tenantId) {
                throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
            }

            // Determine field and previous value
            let previousUserId: string | null;
            let updateResult: number;

            // ATOMIC UPDATE: Fixed SQL per role (NO DYNAMIC FIELD INJECTION)
            if (role === 'DESIGN') {
                previousUserId = existing.assignedDesignerId;
                updateResult = await tx.$executeRaw`
                    UPDATE "Project"
                    SET "assignedDesignerId" = ${newUserId}::uuid,
                        version = version + 1,
                        "updatedAt" = NOW()
                    WHERE id = ${id}::uuid 
                      AND "tenantId" = ${tenantId}
                      AND version = ${version}
                `;
            } else if (role === 'DEV') {
                previousUserId = existing.assignedDevManagerId;
                updateResult = await tx.$executeRaw`
                    UPDATE "Project"
                    SET "assignedDevManagerId" = ${newUserId}::uuid,
                        version = version + 1,
                        "updatedAt" = NOW()
                    WHERE id = ${id}::uuid 
                      AND "tenantId" = ${tenantId}
                      AND version = ${version}
                `;
            } else { // QA
                previousUserId = existing.assignedQAId;
                updateResult = await tx.$executeRaw`
                    UPDATE "Project"
                    SET "assignedQAId" = ${newUserId}::uuid,
                        version = version + 1,
                        "updatedAt" = NOW()
                    WHERE id = ${id}::uuid 
                      AND "tenantId" = ${tenantId}
                      AND version = ${version}
                `;
            }

            // Validate row count
            if (updateResult !== 1) {
                // Fetch current state for 409 response
                const current = await tx.project.findUnique({
                    where: { id },
                    select: { version: true, updatedAt: true }
                });

                throw AppError.conflict('Version conflict', 'VERSION_CONFLICT', {
                    currentVersion: current?.version,
                    expectedVersion: version,
                    updatedAt: current?.updatedAt
                });
            }

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'LEAD_REASSIGNED',
                    target: `Project ${id}`,
                    actorId: userId!,
                    actorEmail: req.user?.email || '',
                    tenantId: tenantId!,
                    metadata: {
                        role,
                        previousUserId,
                        newUserId
                    }
                }
            });

            // Return updated project with relations
            return tx.project.findUnique({
                where: { id },
                include: {
                    assignedDesigner: true,
                    assignedDevManager: true,
                    assignedQA: true
                }
            });
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/projects/:id/team-members
 * 
 * Add team member (Admin OR assigned lead for that role)
 */
export const addTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: projectId } = req.params;
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // Validate request body
        const validated = addTeamMemberSchema.parse(req.body);
        const { leadRole, name, roleTitle, notes, version } = validated;

        // Fetch project for RBAC check
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                tenantId: true,
                assignedDesignerId: true,
                assignedDevManagerId: true
            }
        });

        if (!project || project.tenantId !== tenantId) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        // RBAC: Admin OR assigned lead for that role
        const isAdmin = userRole === UserRole.ADMIN;
        const isDesignLead = leadRole === 'DESIGN' && project.assignedDesignerId === userId;
        const isDevLead = leadRole === 'DEV' && project.assignedDevManagerId === userId;

        if (!isAdmin && !isDesignLead && !isDevLead) {
            throw AppError.forbidden('Only admins or assigned leads can add team members', 'UNAUTHORIZED');
        }

        // Atomic transaction: Version guard + Create member + Audit log
        const result = await prisma.$transaction(async (tx) => {
            // ATOMIC PROJECT VERSION INCREMENT WITH VERSION GUARD
            const updateResult = await tx.$executeRaw`
                UPDATE "Project"
                SET version = version + 1,
                    "updatedAt" = NOW()
                WHERE id = ${projectId}::uuid 
                  AND "tenantId" = ${tenantId}
                  AND version = ${version}
            `;

            // Validate row count
            if (updateResult !== 1) {
                // Fetch current state for 409 response
                const current = await tx.project.findUnique({
                    where: { id: projectId },
                    select: { version: true, updatedAt: true }
                });

                throw AppError.conflict('Version conflict', 'VERSION_CONFLICT', {
                    currentVersion: current?.version,
                    expectedVersion: version,
                    updatedAt: current?.updatedAt
                });
            }

            // Create team member
            const member = await tx.projectTeamMember.create({
                data: {
                    projectId,
                    tenantId: tenantId!,
                    leadRole: leadRole as TeamLeadRole,
                    name,
                    roleTitle,
                    notes
                }
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'TEAM_MEMBER_ADDED',
                    target: `Project ${projectId}`,
                    actorId: userId!,
                    actorEmail: req.user?.email || '',
                    tenantId: tenantId!,
                    metadata: {
                        memberId: member.id,
                        leadRole,
                        name,
                        roleTitle
                    }
                }
            });

            return member;
        });

        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/projects/:id/team-members/:memberId
 * 
 * Update team member (Admin OR assigned lead for that role)
 */
export const updateTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: projectId, memberId } = req.params;
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // Validate request body
        const validated = updateTeamMemberSchema.parse(req.body);
        const { name, roleTitle, notes, version } = validated;

        // Fetch member
        const member = await prisma.projectTeamMember.findUnique({
            where: { id: memberId },
            select: { projectId: true, tenantId: true, leadRole: true }
        });

        if (!member || member.tenantId !== tenantId || member.projectId !== projectId) {
            throw AppError.notFound('Team member not found', 'MEMBER_NOT_FOUND');
        }

        // Fetch project for RBAC check
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                tenantId: true,
                assignedDesignerId: true,
                assignedDevManagerId: true
            }
        });

        if (!project || project.tenantId !== tenantId) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        // RBAC: Admin OR assigned lead for that role
        const isAdmin = userRole === UserRole.ADMIN;
        const isDesignLead = member.leadRole === 'DESIGN' && project.assignedDesignerId === userId;
        const isDevLead = member.leadRole === 'DEV' && project.assignedDevManagerId === userId;

        if (!isAdmin && !isDesignLead && !isDevLead) {
            throw AppError.forbidden('Only admins or assigned leads can update team members', 'UNAUTHORIZED');
        }

        // Atomic transaction: Version guard + Update member + Audit log
        const result = await prisma.$transaction(async (tx) => {
            // ATOMIC PROJECT VERSION INCREMENT WITH VERSION GUARD
            const updateResult = await tx.$executeRaw`
                UPDATE "Project"
                SET version = version + 1,
                    "updatedAt" = NOW()
                WHERE id = ${projectId}::uuid 
                  AND "tenantId" = ${tenantId}
                  AND version = ${version}
            `;

            // Validate row count
            if (updateResult !== 1) {
                // Fetch current state for 409 response
                const current = await tx.project.findUnique({
                    where: { id: projectId },
                    select: { version: true, updatedAt: true }
                });

                throw AppError.conflict('Version conflict', 'VERSION_CONFLICT', {
                    currentVersion: current?.version,
                    expectedVersion: version,
                    updatedAt: current?.updatedAt
                });
            }

            // Update team member
            const updated = await tx.projectTeamMember.update({
                where: { id: memberId },
                data: {
                    ...(name && { name }),
                    ...(roleTitle && { roleTitle }),
                    ...(notes !== undefined && { notes })
                }
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'TEAM_MEMBER_UPDATED',
                    target: `Project ${projectId}`,
                    actorId: userId!,
                    actorEmail: req.user?.email || '',
                    tenantId: tenantId!,
                    metadata: {
                        memberId,
                        updates: { name, roleTitle, notes }
                    }
                }
            });

            return updated;
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/projects/:id/team-members/:memberId
 * 
 * Delete team member (Admin OR assigned lead for that role)
 */
export const deleteTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: projectId, memberId } = req.params;
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        // Validate request body
        const validated = deleteTeamMemberSchema.parse(req.body);
        const { version } = validated;

        // Fetch member
        const member = await prisma.projectTeamMember.findUnique({
            where: { id: memberId },
            select: { projectId: true, tenantId: true, leadRole: true, name: true }
        });

        if (!member || member.tenantId !== tenantId || member.projectId !== projectId) {
            throw AppError.notFound('Team member not found', 'MEMBER_NOT_FOUND');
        }

        // Fetch project for RBAC check
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                tenantId: true,
                assignedDesignerId: true,
                assignedDevManagerId: true
            }
        });

        if (!project || project.tenantId !== tenantId) {
            throw AppError.notFound('Project not found', 'PROJECT_NOT_FOUND');
        }

        // RBAC: Admin OR assigned lead for that role
        const isAdmin = userRole === UserRole.ADMIN;
        const isDesignLead = member.leadRole === 'DESIGN' && project.assignedDesignerId === userId;
        const isDevLead = member.leadRole === 'DEV' && project.assignedDevManagerId === userId;

        if (!isAdmin && !isDesignLead && !isDevLead) {
            throw AppError.forbidden('Only admins or assigned leads can delete team members', 'UNAUTHORIZED');
        }

        // Atomic transaction: Version guard + Delete member + Audit log
        await prisma.$transaction(async (tx) => {
            // ATOMIC PROJECT VERSION INCREMENT WITH VERSION GUARD
            const updateResult = await tx.$executeRaw`
                UPDATE "Project"
                SET version = version + 1,
                    "updatedAt" = NOW()
                WHERE id = ${projectId}::uuid 
                  AND "tenantId" = ${tenantId}
                  AND version = ${version}
            `;

            // Validate row count
            if (updateResult !== 1) {
                // Fetch current state for 409 response
                const current = await tx.project.findUnique({
                    where: { id: projectId },
                    select: { version: true, updatedAt: true }
                });

                throw AppError.conflict('Version conflict', 'VERSION_CONFLICT', {
                    currentVersion: current?.version,
                    expectedVersion: version,
                    updatedAt: current?.updatedAt
                });
            }

            // Delete team member
            await tx.projectTeamMember.delete({
                where: { id: memberId }
            });

            // Audit log
            await tx.auditLog.create({
                data: {
                    action: 'TEAM_MEMBER_REMOVED',
                    target: `Project ${projectId}`,
                    actorId: userId!,
                    actorEmail: req.user?.email || '',
                    tenantId: tenantId!,
                    metadata: {
                        memberId,
                        memberName: member.name,
                        leadRole: member.leadRole
                    }
                }
            });
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
