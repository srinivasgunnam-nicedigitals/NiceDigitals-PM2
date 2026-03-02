// =============================================
// TRACK B — recomputeRemainingStages
// Mid-project recalculation engine.
// Pure function. No DB calls. No side effects.
// =============================================

import {
  MANDATORY_STAGE_KEYS,
  MandatoryStageKey,
  SchedulingRatioConfig,
  STAGE_RATIO_KEY_MAP,
  StageDeadlineMap,
  StageWindow,
} from "./types"

export type RecomputeInput = {
  /**
   * Anchor point for recalculation.
   * Use: current date, or the timestamp of the stage transition
   * that triggered the overallDeadline change.
   * Do NOT use the original project startDate.
   */
  anchorDate: Date

  /** The new (updated) overall deadline. */
  newOverallDeadline: Date

  /**
   * Which stages have already been exited (completed).
   * These are NOT recalculated — their deadlines remain immutable.
   */
  completedStages: MandatoryStageKey[]

  /** The original scheduling config. Ratios will be normalized for remaining stages. */
  config: SchedulingRatioConfig
}

export type RecomputeResult = {
  /** Recalculated deadlines for remaining (not-yet-completed) stages only. */
  updatedDeadlines: Partial<StageDeadlineMap>
  /** Raw windows for audit/debug. */
  windows: StageWindow[]
  /** The normalized ratios used for recalculation, keyed by stage. */
  normalizedRatios: Partial<Record<MandatoryStageKey, number>>
}

/**
 * Recomputes deadlines for incomplete stages after an overallDeadline change.
 *
 * Algorithm:
 *   remainingStages = MANDATORY_STAGE_KEYS - completedStages (preserving order)
 *   R_total = sum of ratios for remaining stages
 *
 *   For each remaining stage i:
 *     normalized_ratio[i] = ratio[i] / R_total
 *     duration[i] = remainingMs × normalized_ratio[i]
 *
 *   Overlap still applied between remaining internal stages.
 *   Anchor is anchorDate (NOT original project start).
 *
 * Invariants:
 *   - completedStages are never touched
 *   - Buffer is preserved (final stage may end before newOverallDeadline)
 *
 * @throws "INVALID_RECALCULATION_TIMELINE"  if newOverallDeadline <= anchorDate
 * @throws "NO_REMAINING_STAGES"             if all stages are completed
 * @throws "INVALID_RATIO_CONFIGURATION"     if remaining ratios all sum to 0
 */
export function recomputeRemainingStages(input: RecomputeInput): RecomputeResult {
  const { anchorDate, newOverallDeadline, completedStages, config } = input

  // --- Guard: timeline sanity ---
  if (newOverallDeadline.getTime() <= anchorDate.getTime()) {
    throw new Error("INVALID_RECALCULATION_TIMELINE")
  }

  // --- Derive remaining (ordered, preserving sequence) ---
  const completedSet = new Set<MandatoryStageKey>(completedStages)
  const remainingStages = MANDATORY_STAGE_KEYS.filter(
    (key) => !completedSet.has(key)
  )

  if (remainingStages.length === 0) {
    throw new Error("NO_REMAINING_STAGES")
  }

  // --- Extract raw ratios for remaining stages ---
  const rawRatios = remainingStages.map(
    (key) => config[STAGE_RATIO_KEY_MAP[key]]
  )
  const totalRawRatio = rawRatios.reduce((a, b) => a + b, 0)

  if (totalRawRatio === 0) {
    throw new Error("INVALID_RATIO_CONFIGURATION: remaining stages have zero total ratio")
  }

  // --- Normalize ratios so they sum to 1.0 across remaining stages ---
  const normalizedFactors = rawRatios.map((r) => r / totalRawRatio)

  // --- Build normalizedRatios map for output transparency ---
  const normalizedRatios: Partial<Record<MandatoryStageKey, number>> = {}
  remainingStages.forEach((stage, i) => {
    // Express as percentage of remaining time (0–100 scale for readability)
    normalizedRatios[stage] = Number((normalizedFactors[i] * 100).toFixed(4))
  })

  const remainingMs =
    newOverallDeadline.getTime() - anchorDate.getTime()
  const overlapFactor = config.overlapPercent / 100

  // --- Compute durations in ms (no rounding yet) ---
  const durations = normalizedFactors.map((f) => remainingMs * f)

  // --- Walk stages and compute windows ---
  const windows: StageWindow[] = []
  let previousEnd = anchorDate.getTime()

  remainingStages.forEach((stage, index) => {
    let stageStart = previousEnd

    if (index > 0) {
      // Overlap only applies between sequential remaining stages
      const overlapAmount = durations[index - 1] * overlapFactor
      stageStart = previousEnd - overlapAmount
    }

    const stageEnd = stageStart + durations[index]

    windows.push({
      stage,
      startMs: stageStart,
      endMs: stageEnd,
      durationMs: durations[index],
    })

    previousEnd = stageEnd
  })

  // --- Build updated deadlines map — round only at final conversion ---
  const updatedDeadlines: Partial<StageDeadlineMap> = {}
  for (const w of windows) {
    updatedDeadlines[w.stage as MandatoryStageKey] = new Date(
      Math.round(w.endMs)
    )
  }

  return { updatedDeadlines, windows, normalizedRatios }
}
