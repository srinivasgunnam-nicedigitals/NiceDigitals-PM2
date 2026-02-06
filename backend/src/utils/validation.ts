import { z } from 'zod';

// Reusable parts
const checklistItemSchema = z.object({
    id: z.string().max(50).optional(),
    text: z.string().max(500),
    completed: z.boolean()
});

export const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required").max(100),
    clientName: z.string().min(1, "Client name is required").max(100),
    scope: z.string().max(5000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    overallDeadline: z.string().datetime(), // Expects ISO string
    currentDeadline: z.string().datetime().optional(),

    // Assignments (Optional strings/UUIDs)
    assignedDesignerId: z.string().uuid().nullable().optional(),
    assignedDevManagerId: z.string().uuid().nullable().optional(),
    assignedQAId: z.string().uuid().nullable().optional(),

    // Checklists (Arrays of objects)
    designChecklist: z.array(checklistItemSchema).max(50).optional(),
    devChecklist: z.array(checklistItemSchema).max(50).optional(),
    qaChecklist: z.array(checklistItemSchema).max(50).optional(),
    finalChecklist: z.array(checklistItemSchema).max(50).optional(),
}).strict(); // Reject unknown fields

export const updateProjectSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    clientName: z.string().min(1).max(100).optional(),
    scope: z.string().max(5000).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    stage: z.enum(['UPCOMING', 'DESIGN', 'DEVELOPMENT', 'QA', 'SEND_TO_CLIENT', 'ADMIN_REVIEW', 'SENT_TO_CLIENT', 'COMPLETED']).optional(),
    overallDeadline: z.string().datetime().optional(),
    currentDeadline: z.string().datetime().optional(),

    isDelayed: z.boolean().optional(),
    qaFailCount: z.number().int().min(0).max(100).optional(),

    // Assignments
    assignedDesignerId: z.string().uuid().nullable().optional(),
    assignedDevManagerId: z.string().uuid().nullable().optional(),
    assignedQAId: z.string().uuid().nullable().optional(),

    // Checklists
    designChecklist: z.array(checklistItemSchema).max(50).optional(),
    devChecklist: z.array(checklistItemSchema).max(50).optional(),
    qaChecklist: z.array(checklistItemSchema).max(50).optional(),
    finalChecklist: z.array(checklistItemSchema).max(50).optional(),

    // Explicit signal for history generation (Frontend asks for 'action')
    // We allow `newHistoryItem` structure to be passed, but VALIDATE it strictly
    // Actually, controller logic seems to use `newHistoryItem` to trigger logic.
    // Let's validate the SHAPE of what frontend sends, if we keep allowing it.
    newHistoryItem: z.object({
        action: z.string().max(200),
        rejectionSnapshot: z.array(z.any()).max(50).optional() // Weak validation on snapshot for now to match flexible JSON
    }).optional()

}).strict();

export const addCommentSchema = z.object({
    text: z.string().min(1, "Comment text is required").max(2000)
}).strict();

export const advanceStageSchema = z.object({
    nextStage: z.enum(['UPCOMING', 'DESIGN', 'DEVELOPMENT', 'QA', 'SEND_TO_CLIENT', 'ADMIN_REVIEW', 'SENT_TO_CLIENT', 'COMPLETED'])
}).strict();

export const recordQAFeedbackSchema = z.object({
    passed: z.boolean()
}).strict();
