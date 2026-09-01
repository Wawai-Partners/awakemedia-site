/**
 * How ready the page is to be looked at, 0 to 1.
 *
 * Deliberately fed by things that are actually still loading, rather than a
 * timer easing to 100%. A bar that finishes on its own schedule tells the
 * reader nothing, and lies when the connection is slow: it hits 100% while the
 * page behind it is still blank.
 *
 * Two sources, weighted by how long they really take here:
 *
 *  - fonts, three self-hosted Poppins faces, a few hundred KB
 *  - the scroll-video frame cache's first pass, which is the slow one - the
 *    clip is 26MB and the pass is over twenty seeks into it
 *
 * Progress only ever moves forward. A bar that goes backwards is worse than no
 * bar, and both sources can report a lower number than they did before (a
 * second ScrollVideo mount starts its cache again).
 */

const WEIGHT = { fonts: 1, frames: 3 } as const

type Stage = keyof typeof WEIGHT

const STAGES = Object.keys(WEIGHT) as Stage[]
const TOTAL = STAGES.reduce((sum, stage) => sum + WEIGHT[stage], 0)

const done: Record<Stage, number> = { fonts: 0, frames: 0 }
const listeners = new Set<(progress: number) => void>()

export function loadingProgress() {
  let sum = 0
  for (const stage of STAGES) sum += done[stage] * WEIGHT[stage]
  return sum / TOTAL
}

/**
 * `fraction` is that stage's own completion, 0 to 1. Report 1 on failure too:
 * the stage is as done as it is ever going to be, and stalling the bar at 40%
 * because a video 404'd is not more honest, just less useful.
 */
export function reportLoading(stage: Stage, fraction: number) {
  const next = Math.min(1, Math.max(0, fraction))
  if (next <= done[stage]) return
  done[stage] = next
  const progress = loadingProgress()
  for (const listener of listeners) listener(progress)
}

export function onLoadingProgress(listener: (progress: number) => void) {
  listeners.add(listener)
  listener(loadingProgress())
  return () => {
    listeners.delete(listener)
  }
}

/** The one source that has nothing to do with the video. */
export function watchFonts() {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    reportLoading('fonts', 1)
    return
  }
  document.fonts.ready.then(
    () => reportLoading('fonts', 1),
    () => reportLoading('fonts', 1),
  )
}
