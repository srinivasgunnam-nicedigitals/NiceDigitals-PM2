// =============================================
// TRACK B — Scheduling Engine Public API
// =============================================

export { computeStageDeadlines, computeStageDeadlinesWithWindows } from "./computeStageDeadlines"
export { recomputeRemainingStages } from "./recomputeRemainingStages"
export type {
  ComputeStageDeadlineInput,
  MandatoryStageKey,
  SchedulingRatioConfig,
  StageDeadlineMap,
  StageWindow,
} from "./types"
export type { RecomputeInput, RecomputeResult } from "./recomputeRemainingStages"
export { MANDATORY_STAGE_KEYS, STAGE_RATIO_KEY_MAP } from "./types"

// Orchestration layer (DB integration)
export {
  allocateInitialStageDeadlines,
  recalculateFutureStageDeadlines,
  updateSingleStageDeadline,
  STAGE_ORDER,
} from "./stageDeadlineOrchestrator"
export type {
  AllocateInitialDeadlinesInput,
  RecalculateFutureDeadlinesInput,
  UpdateSingleStageDeadlineInput,
} from "./stageDeadlineOrchestrator"
