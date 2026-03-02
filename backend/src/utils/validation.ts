import { z } from 'zod';
import { startOfDay } from 'date-fns';

const dateNotPast = (val: string) => {
    const today = startOfDay(new Date());
    const inputDate = new Date(val);
    return inputDate >= today;
};

// Reusable parts
const checklistItemSchema = z.object({
    id: z.string().max(50).optional(),
    label: z.string().max(500),
    completed: z.boolean()
});

export const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required").max(100),
    clientName: z.string().min(1, "Client name is required").max(100),
    scope: z.string().max(5000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    overallDeadline: z.string().datetime().refine(dateNotPast, "Deadline cannot be in the past"),
    currentDeadline: z.string().datetime().refine(dateNotPast, "Deadline cannot be in the past").optional(),

    // Assignments (Optional strings/UUIDs)
    assignedDesignerId: z.string().uuid().nullable().optional(),
    assignedDevManagerId: z.string().uuid().nullable().optional(),
    assignedQAId: z.string().uuid().nullable().optional(),

    // Checklists (Arrays of objects)
    useDefaultChecklists: z.boolean().optional(),
    designChecklist: z.array(checklistItemSchema).max(50).optional(),
    devChecklist: z.array(checklistItemSchema).max(50).optional(),
    qaChecklist: z.array(checklistItemSchema).max(50).optional(),
    finalChecklist: z.array(checklistItemSchema).max(50).optional(),
    clientReviewChecklist: z.array(checklistItemSchema).max(50).optional(),
    clientUatChecklist: z.array(checklistItemSchema).max(50).optional(),
    deploymentChecklist: z.array(checklistItemSchema).max(50).optional(),
}).strict(); // Reject unknown fields

// === ADMIN AUTHORITY SCHEMA ===
// Admins can update EVERYTHING including definition, assignments, and scope.
export const adminUpdateProjectSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    clientName: z.string().min(1).max(100).optional(),
    scope: z.string().max(5000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    stage: z.enum(['DISCOVERY', 'DESIGN', 'CLIENT_REVIEW', 'DEVELOPMENT', 'INTERNAL_QA', 'INTERNAL_APPROVAL', 'CLIENT_UAT', 'DEPLOYMENT', 'COMPLETED']).optional(),
    overallDeadline: z.string().datetime().refine(dateNotPast, "Deadline cannot be in the past").optional(),
    currentDeadline: z.string().datetime().refine(dateNotPast, "Deadline cannot be in the past").optional(),

    isDelayed: z.boolean().optional(),
    qaFailCount: z.number().int().min(0).max(100).optional(),

    // Assignments
    assignedDesignerId: z.string().uuid().nullable().optional(),
    assignedDevManagerId: z.string().uuid().nullable().optional(),
    assignedQAId: z.string().uuid().nullable().optional(),

    // Checklists - Admins can override these too
    designChecklist: z.array(checklistItemSchema).max(50).optional(),
    devChecklist: z.array(checklistItemSchema).max(50).optional(),
    qaChecklist: z.array(checklistItemSchema).max(50).optional(),
    finalChecklist: z.array(checklistItemSchema).max(50).optional(),
    clientReviewChecklist: z.array(checklistItemSchema).max(50).optional(),
    clientUatChecklist: z.array(checklistItemSchema).max(50).optional(),
    deploymentChecklist: z.array(checklistItemSchema).max(50).optional(),

    // History Trigger
    newHistoryItem: z.object({
        action: z.string().max(200),
        rejectionSnapshot: z.array(z.any()).max(50).optional()
    }).optional(),

    // VERSION ENFORCEMENT: Required for optimistic locking
    version: z.number().int().positive()
}).strict(); // REJECTS unknown fields

// === MEMBER AUTHORITY SCHEMA ===
// Members (Designers, QA, Devs) can ONLY update checklists and working status.
// THEY CANNOT CHANGE Scope, Priority, or Assignments.
export const memberUpdateProjectSchema = z.object({
    // NO core definition fields
    // NO scope
    // NO priority
    // NO assignments

    // Members can only update progress artifacts:
    designChecklist: z.array(checklistItemSchema).max(50).optional(),
    devChecklist: z.array(checklistItemSchema).max(50).optional(),
    qaChecklist: z.array(checklistItemSchema).max(50).optional(),
    finalChecklist: z.array(checklistItemSchema).max(50).optional(),
    clientReviewChecklist: z.array(checklistItemSchema).max(50).optional(),
    clientUatChecklist: z.array(checklistItemSchema).max(50).optional(),
    deploymentChecklist: z.array(checklistItemSchema).max(50).optional(),

    // Members can trigger specific history items related to their work
    newHistoryItem: z.object({
        action: z.string().max(200),
        rejectionSnapshot: z.array(z.any()).max(50).optional()
    }).optional(),

    // VERSION ENFORCEMENT: Required for optimistic locking
    version: z.number().int().positive()
}).strict(); // REJECTS Any Admin field attempts

export const addCommentSchema = z.object({
    text: z.string().min(1, "Comment text is required").max(2000)
}).strict();

export const advanceStageSchema = z.object({
    nextStage: z.enum(['DISCOVERY', 'DESIGN', 'CLIENT_REVIEW', 'DEVELOPMENT', 'INTERNAL_QA', 'INTERNAL_APPROVAL', 'CLIENT_UAT', 'DEPLOYMENT', 'COMPLETED']),
    revertReasonCategory: z.enum(['DESIGN_CLARIFICATION', 'DEV_IMPLEMENTATION_BUG', 'QA_MISS', 'CLIENT_CHANGE_REQUEST', 'SCOPE_EXPANSION', 'PERFORMANCE_ISSUE', 'CONTENT_MISSING', 'OTHER']).optional(),
    revertReasonNote: z.string().optional(),
    // VERSION ENFORCEMENT: Required for optimistic locking
    version: z.number().int().positive()
}).strict();

// Phase 2A: Admin deadline modification
export const changeDeadlineSchema = z.object({
    newDeadline: z.string().datetime().refine(dateNotPast, "Deadline cannot be in the past"),
    justification: z.string().min(15, 'Justification must be at least 15 characters'),
    confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmation required' }) }),
    version: z.number().int().positive()
}).strict();

// Phase 2A: Lead reassignment
export const reassignLeadSchema = z.object({
    role: z.enum(['DESIGN', 'DEV', 'QA']),
    userId: z.string().uuid(),
    version: z.number().int().positive()
}).strict();

// Phase 2A: Team member operations
export const addTeamMemberSchema = z.object({
    leadRole: z.enum(['DESIGN', 'DEV', 'QA']),
    name: z.string().min(1).max(100),
    roleTitle: z.string().min(1).max(100),
    notes: z.string().max(500).optional(),
    version: z.number().int().positive()
}).strict();

export const updateStageDeadlineSchema = z.object({
    newDeadline: z.string().datetime(), // ISO string expectation
    reason: z.string().min(15, "Reason must be at least 15 characters long"),
    delayResponsibility: z.enum(['INTERNAL', 'CLIENT', 'EXTERNAL'])
}).strict();

export const updateTeamMemberSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    roleTitle: z.string().min(1).max(100).optional(),
    notes: z.string().max(500).optional().nullable(),
    version: z.number().int().positive()
}).strict();

export const deleteTeamMemberSchema = z.object({
    version: z.number().int().positive()
}).strict();

// === PHASE 1.5: CHECKLIST TEMPLATES ===
export const createChecklistTemplateSchema = z.object({
    stage: z.enum(['DISCOVERY', 'DESIGN', 'CLIENT_REVIEW', 'DEVELOPMENT', 'INTERNAL_QA', 'INTERNAL_APPROVAL', 'CLIENT_UAT', 'DEPLOYMENT', 'COMPLETED']),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isDefault: z.boolean().optional(),
    items: z.array(z.object({
        id: z.string().optional(),
        label: z.string().min(1).max(500),
        required: z.boolean().optional()
    })).max(100)
}).strict();

export const updateChecklistTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isDefault: z.boolean().optional(),
    items: z.array(z.object({
        id: z.string().optional(),
        label: z.string().min(1).max(500),
        required: z.boolean().optional()
    })).max(100).optional()
}).strict();

// === PHASE 3A: TENANT SCHEDULING CONFIG ===
export const updateSchedulingConfigSchema = z.object({
    designRatio: z.number().int().min(0).max(100),
    developmentRatio: z.number().int().min(0).max(100),
    qaRatio: z.number().int().min(0).max(100),
    approvalRatio: z.number().int().min(0).max(100),
    overlapPercent: z.number().int().min(0).max(50),
    autoAllocate: z.boolean()
}).strict();
