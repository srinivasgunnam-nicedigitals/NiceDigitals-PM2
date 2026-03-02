// =============================================
// TRACK B — computeStageDeadlines
// Pure deterministic engine. No DB calls.
// No side effects. No mutations.
// =============================================

import {
  ComputeStageDeadlineInput,
  MANDATORY_STAGE_KEYS,
  MandatoryStageKey,
  STAGE_RATIO_KEY_MAP,
  StageDeadlineMap,
  StageWindow,
} from "./types"

/**
 * Computes deadline dates for the four mandatory internal stages.
 *
 * Algorithm:
 *   T = overallDeadline - startDate
 *   stageDuration[i] = T × (ratio[i] / 100)
 *
 *   For stage 0:
 *     start[0] = startDate
 *     end[0]   = startDate + duration[0]
 *
 *   For stage i > 0:
 *     overlapAmount = duration[i-1] × (overlapPercent / 100)
 *     start[i]      = end[i-1] - overlapAmount
 *     end[i]        = start[i] + duration[i]
 *
 * Intentional buffer: final stage MAY end before overallDeadline.
 * This gap is the implicit project buffer — do NOT stretch to fill it.
 *
 * @throws "INVALID_PROJECT_TIMELINE"     if overallDeadline <= startDate
 * @throws "INVALID_RATIO_CONFIGURATION"  if ratios do not sum to 100
 */
export function computeStageDeadlines(
  input: ComputeStageDeadlineInput
): StageDeadlineMap {
  const { startDate, overallDeadline, config } = input

  // --- Guard: timeline sanity ---
  if (overallDeadline.getTime() <= startDate.getTime()) {
    throw new Error("INVALID_PROJECT_TIMELINE")
  }

  // --- Guard: ratio integrity ---
  const ratios = MANDATORY_STAGE_KEYS.map(
    (key) => config[STAGE_RATIO_KEY_MAP[key]]
  )
  const totalRatio = ratios.reduce((a, b) => a + b, 0)
  if (totalRatio !== 100) {
    throw new Error(
      `INVALID_RATIO_CONFIGURATION: ratios sum to ${totalRatio}, expected 100`
    )
  }

  const totalMs = overallDeadline.getTime() - startDate.getTime()
  const overlapFactor = config.overlapPercent / 100

  // --- Compute stage durations in milliseconds (no rounding yet) ---
  const durations: number[] = ratios.map((r) => totalMs * (r / 100))

  // --- Walk through stages and compute windows ---
  const windows: StageWindow[] = []
  let previousEnd = startDate.getTime()

  MANDATORY_STAGE_KEYS.forEach((stage, index) => {
    let stageStart = previousEnd

    if (index > 0) {
      // Overlap pulls this stage's start back into the previous stage's window
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

  // --- Build result map — round only at the final ms→Date conversion ---
  const result = {} as StageDeadlineMap
  for (const window of windows) {
    result[window.stage as MandatoryStageKey] = new Date(
      Math.round(window.endMs)
    )
  }

  return result
}

/**
 * Extended version that also returns the raw StageWindow[] for debugging
 * and audit purposes. Not exported to public API — internal use only.
 */
export function computeStageDeadlinesWithWindows(
  input: ComputeStageDeadlineInput
): { deadlines: StageDeadlineMap; windows: StageWindow[] } {
  const { startDate, overallDeadline, config } = input

  if (overallDeadline.getTime() <= startDate.getTime()) {
    throw new Error("INVALID_PROJECT_TIMELINE")
  }

  const ratios = MANDATORY_STAGE_KEYS.map(
    (key) => config[STAGE_RATIO_KEY_MAP[key]]
  )
  const totalRatio = ratios.reduce((a, b) => a + b, 0)
  if (totalRatio !== 100) {
    throw new Error(
      `INVALID_RATIO_CONFIGURATION: ratios sum to ${totalRatio}, expected 100`
    )
  }

  const totalMs = overallDeadline.getTime() - startDate.getTime()
  const overlapFactor = config.overlapPercent / 100
  const durations: number[] = ratios.map((r) => totalMs * (r / 100))

  const windows: StageWindow[] = []
  let previousEnd = startDate.getTime()

  MANDATORY_STAGE_KEYS.forEach((stage, index) => {
    let stageStart = previousEnd

    if (index > 0) {
      const overlapAmount = durations[index - 1] * overlapFactor
      stageStart = previousEnd - overlapAmount
    }

    const stageEnd = stageStart + durations[index]
    windows.push({ stage, startMs: stageStart, endMs: stageEnd, durationMs: durations[index] })
    previousEnd = stageEnd
  })

  const deadlines = {} as StageDeadlineMap
  for (const w of windows) {
    deadlines[w.stage as MandatoryStageKey] = new Date(Math.round(w.endMs))
  }

  return { deadlines, windows }
}
