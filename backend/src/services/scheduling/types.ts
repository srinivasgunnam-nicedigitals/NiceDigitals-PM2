// =============================================
// TRACK B — Stage Deadline Scheduling Engine
// Types & Contracts
// =============================================

export type SchedulingRatioConfig = {
  designRatio: number
  developmentRatio: number
  qaRatio: number
  approvalRatio: number
  overlapPercent: number
}

export type ComputeStageDeadlineInput = {
  startDate: Date
  overallDeadline: Date
  config: SchedulingRatioConfig
}

/**
 * Output of computeStageDeadlines.
 * Contains only the four mandatory internal stages.
 * Client stages (CLIENT_REVIEW, CLIENT_UAT, DEPLOYMENT) are manually controlled.
 */
export type StageDeadlineMap = {
  DESIGN: Date
  DEVELOPMENT: Date
  INTERNAL_QA: Date
  INTERNAL_APPROVAL: Date
}

/**
 * Represents a single stage's computed window.
 * Used internally for transparency and debugging.
 */
export type StageWindow = {
  stage: keyof StageDeadlineMap
  startMs: number
  endMs: number
  durationMs: number
}

// Ordered array of mandatory internal stages — order is authoritative.
export const MANDATORY_STAGE_KEYS = [
  "DESIGN",
  "DEVELOPMENT",
  "INTERNAL_QA",
  "INTERNAL_APPROVAL",
] as const

export type MandatoryStageKey = (typeof MANDATORY_STAGE_KEYS)[number]

// Maps each stage key to its ratio field in SchedulingRatioConfig
export const STAGE_RATIO_KEY_MAP: Record<MandatoryStageKey, keyof SchedulingRatioConfig> = {
  DESIGN: "designRatio",
  DEVELOPMENT: "developmentRatio",
  INTERNAL_QA: "qaRatio",
  INTERNAL_APPROVAL: "approvalRatio",
}
