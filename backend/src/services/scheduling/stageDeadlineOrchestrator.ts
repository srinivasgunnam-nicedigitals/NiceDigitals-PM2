// =============================================
// TRACK B — Stage Deadline Orchestrator
// Controlled DB integration layer.
// All writes go through Prisma transactions.
// No direct controller writes to deadline fields.
// =============================================

import { prisma } from '../../config/db'
import { DelayResponsibility, ProjectStage, Prisma } from '@prisma/client'
import { computeStageDeadlines } from './computeStageDeadlines'
import { recomputeRemainingStages } from './recomputeRemainingStages'
import { MANDATORY_STAGE_KEYS, MandatoryStageKey } from './types'
import { AppError } from '../../utils/AppError'

// ─── Stage ordering (authoritative, used for lock enforcement) ───────────────
// Mirrors the business flow order. Client stages (CLIENT_REVIEW, CLIENT_UAT)
// are positioned to reflect where they sit in the overall project lifecycle.
export const STAGE_ORDER: ProjectStage[] = [
  ProjectStage.DISCOVERY,
  ProjectStage.DESIGN,
  ProjectStage.CLIENT_REVIEW,
  ProjectStage.DEVELOPMENT,
  ProjectStage.INTERNAL_QA,
  ProjectStage.INTERNAL_APPROVAL,
  ProjectStage.CLIENT_UAT,
  ProjectStage.DEPLOYMENT,
  ProjectStage.COMPLETED,
]

// Maps mandatory internal stage keys to their Project deadline column names
const STAGE_DEADLINE_FIELD_MAP: Record<MandatoryStageKey, string> = {
  DESIGN: 'designDeadline',
  DEVELOPMENT: 'developmentDeadline',
  INTERNAL_QA: 'internalQaDeadline',
  INTERNAL_APPROVAL: 'approvalDeadline',
}

/** Returns the index of a stage in STAGE_ORDER, or -1 if not found. */
function stageIndex(stage: ProjectStage | string): number {
  return STAGE_ORDER.indexOf(stage as ProjectStage)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INITIAL ALLOCATION
// Called immediately after project creation when autoAllocate = true.
// Runs in its own transaction (separate from project creation to keep txn lean).
// ─────────────────────────────────────────────────────────────────────────────

export type AllocateInitialDeadlinesInput = {
  projectId: string
  /** userId of the admin who created the project — changedByUserId on revisions */
  createdByUserId: string
}

/**
 * Computes and writes per-stage deadlines for a newly created project.
 *
 * Conditions checked inside (all must be true or function is a no-op):
 *   - tenant.stageSchedulingConfig exists
 *   - autoAllocate === true
 *   - No existing stage deadlines (idempotency guard via designDeadline !== null)
 *
 * Side effects:
 *   - Updates Project deadline columns
 *   - Inserts 4 StageDeadlineRevision rows (previousDeadline = null)
 */
export async function allocateInitialStageDeadlines(
  input: AllocateInitialDeadlinesInput
): Promise<void> {
  const { projectId, createdByUserId } = input

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const project = await tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: {
        id: true,
        tenantId: true,
        createdAt: true,
        overallDeadline: true,
        designDeadline: true, // idempotency check
      },
    })

    const config = await tx.stageSchedulingConfig.findUnique({
      where: { tenantId: project.tenantId },
    })

    // Guard: no config or autoAllocate disabled → silent no-op
    if (!config || !config.autoAllocate) return

    // Guard: idempotency — deadlines already allocated (prevents duplicate revision rows
    // on server restart, retry, or double-fire of the after-response hook)
    if (project.designDeadline !== null) return

    // Anchor: project.createdAt is the canonical start (no separate startDate field).
    // Always set to new Date() at creation time — UTC-safe, precise.
    const startDate: Date = project.createdAt
    const overallDeadline: Date = project.overallDeadline

    // Guard: timeline sanity
    if (overallDeadline.getTime() <= startDate.getTime()) {
      throw AppError.badRequest(
        'Project overall deadline must be after creation date for auto-scheduling',
        'INVALID_PROJECT_TIMELINE'
      )
    }

    // ── Pure math computation ──────────────────────────────────────────────
    const computed = computeStageDeadlines({
      startDate,
      overallDeadline,
      config: {
        designRatio: config.designRatio,
        developmentRatio: config.developmentRatio,
        qaRatio: config.qaRatio,
        approvalRatio: config.approvalRatio,
        overlapPercent: config.overlapPercent,
      },
    })

    // ── Write deadline columns to Project ────────────────────────────────
    await tx.project.update({
      where: { id: projectId },
      data: {
        designDeadline: computed.DESIGN,
        developmentDeadline: computed.DEVELOPMENT,
        internalQaDeadline: computed.INTERNAL_QA,
        approvalDeadline: computed.INTERNAL_APPROVAL,
      },
    })

    // ── Log one revision per stage (append-only audit trail) ─────────────
    for (const stage of MANDATORY_STAGE_KEYS) {
      await tx.stageDeadlineRevision.create({
        data: {
          tenantId: project.tenantId,
          projectId,
          stage: stage as ProjectStage,
          previousDeadline: null,
          newDeadline: computed[stage],
          reason: 'Initial auto allocation',
          delayResponsibility: DelayResponsibility.INTERNAL,
          changedByUserId: createdByUserId,
        },
      })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECALCULATION ON overallDeadline CHANGE
// Called when overallDeadline changes — regardless of autoAllocate flag.
// ─────────────────────────────────────────────────────────────────────────────

export type RecalculateFutureDeadlinesInput = {
  projectId: string
  changedByUserId: string
  previousOverallDeadline: Date
  newOverallDeadline: Date
  reason: string
  delayResponsibility: DelayResponsibility
}

/**
 * Recalculates deadlines for all incomplete internal stages after an
 * overallDeadline change.
 *
 * Behaviour:
 *   - Logs an OVERALL revision ALWAYS (even when autoAllocate = false).
 *     This is required for Track C fairness — every overall deadline change
 *     must be attributable regardless of scheduling mode.
 *   - Only recalculates stage deadlines if autoAllocate = true.
 *   - Determines completed stages from project.stage position in STAGE_ORDER.
 *   - Calls recomputeRemainingStages() anchored to NOW (not original startDate).
 *   - Updates only non-exited stage deadline columns.
 *   - Logs a StageDeadlineRevision per updated stage.
 *   - Never touches completed stage deadlines.
 */
export async function recalculateFutureStageDeadlines(
  input: RecalculateFutureDeadlinesInput
): Promise<void> {
  const {
    projectId,
    changedByUserId,
    previousOverallDeadline,
    newOverallDeadline,
    reason,
    delayResponsibility,
  } = input

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const project = await tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: {
        id: true,
        tenantId: true,
        stage: true,
        overallDeadline: true,
        designDeadline: true,
        developmentDeadline: true,
        internalQaDeadline: true,
        approvalDeadline: true,
      },
    })

    // ── ALWAYS log the OVERALL deadline revision ──────────────────────────
    // This MUST happen before any autoAllocate guard.
    // Reason: Track C needs the full overallDeadline change history to fairly
    // assess delay responsibility, even for tenants using manual scheduling.
    await tx.stageDeadlineRevision.create({
      data: {
        tenantId: project.tenantId,
        projectId,
        stage: 'OVERALL' as ProjectStage,
        previousDeadline: previousOverallDeadline,
        newDeadline: newOverallDeadline,
        reason,
        delayResponsibility,
        changedByUserId,
      },
    })

    // ── Fetch config — only needed for stage recalculation ────────────────
    const config = await tx.stageSchedulingConfig.findUnique({
      where: { tenantId: project.tenantId },
    })

    // Guard: no config or autoAllocate disabled → OVERALL revision was logged above,
    // but we do NOT recalculate stage deadlines (admin controls them manually).
    if (!config || !config.autoAllocate) return

    // ── Determine completed vs remaining mandatory stages ─────────────────
    // A stage is "exited" if the project has progressed strictly past it in STAGE_ORDER.
    // The current active stage is NOT locked — only stages before it are.
    const currentStageIdx = stageIndex(project.stage)

    const completedInternalStages = MANDATORY_STAGE_KEYS.filter(
      (key: MandatoryStageKey) => stageIndex(key) < currentStageIdx
    )
    const remainingInternalStages = MANDATORY_STAGE_KEYS.filter(
      (key: MandatoryStageKey) => !completedInternalStages.includes(key)
    )

    // Guard: all mandatory stages already exited → nothing left to recalculate
    if (remainingInternalStages.length === 0) return

    // Guard: new deadline must be in the future relative to NOW (anchor point)
    const anchorDate = new Date()
    if (newOverallDeadline.getTime() <= anchorDate.getTime()) {
      throw AppError.badRequest(
        'New overall deadline is in the past — cannot recalculate future stage deadlines',
        'INVALID_RECALCULATION_TIMELINE'
      )
    }

    // ── Recompute remaining stages anchored at NOW ────────────────────────
    // Per specification: anchor = NOW, not original project startDate.
    // This prevents timeline distortion when mid-project recalculation occurs.
    const { updatedDeadlines } = recomputeRemainingStages({
      anchorDate,
      newOverallDeadline,
      completedStages: completedInternalStages as MandatoryStageKey[],
      config: {
        designRatio: config.designRatio,
        developmentRatio: config.developmentRatio,
        qaRatio: config.qaRatio,
        approvalRatio: config.approvalRatio,
        overlapPercent: config.overlapPercent,
      },
    })

    // ── Previous deadline snapshot for revision logs ──────────────────────
    const previousDeadlines: Record<MandatoryStageKey, Date | null> = {
      DESIGN: project.designDeadline,
      DEVELOPMENT: project.developmentDeadline,
      INTERNAL_QA: project.internalQaDeadline,
      INTERNAL_APPROVAL: project.approvalDeadline,
    }

    // ── Build and apply Project update (remaining stages only) ────────────
    const deadlineUpdateData: Record<string, Date> = {}
    for (const stage of remainingInternalStages) {
      const newDeadline = updatedDeadlines[stage]
      if (newDeadline) deadlineUpdateData[STAGE_DEADLINE_FIELD_MAP[stage]] = newDeadline
    }

    await tx.project.update({
      where: { id: projectId },
      data: deadlineUpdateData,
    })

    // ── Log one revision per updated stage ────────────────────────────────
    for (const stage of remainingInternalStages) {
      const newDeadline = updatedDeadlines[stage]
      if (!newDeadline) continue

      await tx.stageDeadlineRevision.create({
        data: {
          tenantId: project.tenantId,
          projectId,
          stage: stage as ProjectStage,
          previousDeadline: previousDeadlines[stage] ?? null,
          newDeadline,
          reason: `Recalculated following overallDeadline change: ${reason}`,
          delayResponsibility,
          changedByUserId,
        },
      })
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MANUAL DEADLINE EDIT (Admin modal — Phase 3 / future)
// ─────────────────────────────────────────────────────────────────────────────

export type UpdateSingleStageDeadlineInput = {
  projectId: string
  tenantId: string
  changedByUserId: string
  stage: MandatoryStageKey
  newDeadline: Date
  reason: string
  delayResponsibility: DelayResponsibility
}

/**
 * Updates a single stage deadline with full audit logging.
 * Enforces the lock rule: stages already exited cannot be edited.
 *
 * Guards:
 *   - reason length ≥ 15 chars (quality enforcement)
 *   - target stage not already exited (STAGE_DEADLINE_LOCKED)
 *   - newDeadline does not exceed overallDeadline (DEADLINE_EXCEEDS_OVERALL)
 */
export async function updateSingleStageDeadline(
  input: UpdateSingleStageDeadlineInput
): Promise<void> {
  const { projectId, tenantId, changedByUserId, stage, newDeadline, reason, delayResponsibility } = input

  if (!reason || reason.trim().length < 15) {
    throw AppError.badRequest(
      'Deadline change reason must be at least 15 characters',
      'REASON_TOO_SHORT'
    )
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const project = await tx.project.findUniqueOrThrow({
      where: { id: projectId, tenantId },
      select: {
        id: true,
        tenantId: true,
        stage: true,
        overallDeadline: true,
        designDeadline: true,
        developmentDeadline: true,
        internalQaDeadline: true,
        approvalDeadline: true,
      },
    })

    // ── Lock enforcement ─────────────────────────────────────────────────
    // A stage is locked once the project has progressed strictly past it.
    // Prevents retroactive deadline manipulation for leaderboard scoring.
    const currentStageIdx = stageIndex(project.stage)
    const targetStageIdx = stageIndex(stage)

    if (targetStageIdx < currentStageIdx) {
      throw AppError.badRequest(
        `Cannot edit deadline for ${stage} — stage has already been exited`,
        'STAGE_DEADLINE_LOCKED'
      )
    }

    // ── Deadline boundary check ──────────────────────────────────────────
    if (newDeadline > project.overallDeadline) {
      throw AppError.badRequest(
        `Stage deadline cannot extend beyond the project overall deadline`,
        'DEADLINE_EXCEEDS_OVERALL'
      )
    }

    // ── Read previous deadline for revision log ──────────────────────────
    const previousDeadlines: Record<MandatoryStageKey, Date | null> = {
      DESIGN: project.designDeadline,
      DEVELOPMENT: project.developmentDeadline,
      INTERNAL_QA: project.internalQaDeadline,
      INTERNAL_APPROVAL: project.approvalDeadline,
    }

    // ── Update Project column ────────────────────────────────────────────
    await tx.project.update({
      where: { id: projectId },
      data: { [STAGE_DEADLINE_FIELD_MAP[stage]]: newDeadline },
    })

    // ── Log revision (append-only) ────────────────────────────────────────
    await tx.stageDeadlineRevision.create({
      data: {
        tenantId: project.tenantId,
        projectId,
        stage: stage as ProjectStage,
        previousDeadline: previousDeadlines[stage] ?? null,
        newDeadline,
        reason: reason.trim(),
        delayResponsibility,
        changedByUserId,
      },
    })
  })
}
