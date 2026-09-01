/**
 * Ordering and lookup for the scroll-video frame cache.
 *
 * Pure functions, kept out of the component so they can be exercised directly:
 * the component's own paint path cannot run in a headless browser, because the
 * clip is h264 and headless Chromium will not decode it.
 */

/**
 * How many frames the first pass should aim for. Below about a dozen the gaps
 * are long enough that blending between neighbours reads as a slow blur rather
 * than motion; far above it the pass stops being quick, which is the whole
 * point of having one.
 */
const FIRST_PASS_TARGET = 12

/**
 * Extraction order, as a list of passes.
 *
 * The cache used to be filled front to back and published only once every
 * frame was in, which for ninety frames is ninety seeks through a 26MB clip.
 * Until that finished there was nothing to paint from, so the backdrop fell
 * back to seeking the <video> element on every scroll frame - the choppiest
 * path available, and the reason first load looked worse than a moment later.
 *
 * So it is filled in halving strides instead: a coarse pass that covers the
 * whole clip in a fraction of the seeks, then passes that fill the gaps between
 * what is already there. The painter can work off the first pass, and every
 * later pass sharpens the same picture rather than replacing it.
 *
 * Each pass walks forward, never back. A monotonic seek is the cheap case for
 * h264, and a bisecting order - which would give the same progression - would
 * make every seek a random access instead.
 */
export function stridePasses(count: number): number[][] {
  if (count <= 0) return []
  if (count === 1) return [[0]]

  // Largest halving stride that still leaves the first pass a useful size.
  let stride = 1
  while (stride * 2 <= count / FIRST_PASS_TARGET) stride *= 2

  const passes: number[][] = []
  const taken = new Array<boolean>(count).fill(false)

  for (;;) {
    const pass: number[] = []
    for (let i = 0; i < count; i += stride) {
      if (!taken[i]) {
        taken[i] = true
        pass.push(i)
      }
    }
    if (stride === 1) {
      // The halving walk lands on multiples only, so a tail index can be left
      // over. Sweep whatever is still missing into the final pass.
      for (let i = 0; i < count; i++) {
        if (!taken[i]) {
          taken[i] = true
          pass.push(i)
        }
      }
    }
    if (pass.length) passes.push(pass)
    if (stride === 1) break
    stride = Math.floor(stride / 2)
  }

  return passes
}

export type Blend = {
  /** Index of the frame to draw first, at full opacity. */
  lo: number
  /** Index to draw over it; equal to `lo` when there is nothing to blend to. */
  hi: number
  /** Opacity for `hi`, 0 to 1. */
  t: number
}

/**
 * The two cached frames to blend for a continuous playhead position.
 *
 * `pos` is in frame units, 0 to count-1. While the cache is still filling, the
 * frames either side of the playhead may not be there yet, so this walks out to
 * the nearest ones that are and rescales the blend across the real gap. That is
 * what lets the painter run off a coarse first pass and simply get sharper as
 * later passes land, with no special case for "not ready yet".
 *
 * Returns null only when the cache is completely empty.
 */
export function blendAt(frames: ArrayLike<unknown>, pos: number): Blend | null {
  const n = frames.length
  if (n === 0) return null

  const clamped = Math.min(n - 1, Math.max(0, pos))
  const floor = Math.floor(clamped)

  let lo = -1
  for (let i = floor; i >= 0; i--) {
    if (frames[i]) {
      lo = i
      break
    }
  }

  let hi = -1
  for (let i = floor + 1; i < n; i++) {
    if (frames[i]) {
      hi = i
      break
    }
  }

  if (lo < 0 && hi < 0) return null
  // Past either end of what has been filled: hold the nearest frame.
  if (lo < 0) return { lo: hi, hi, t: 0 }
  if (hi < 0) return { lo, hi: lo, t: 0 }

  return { lo, hi, t: (clamped - lo) / (hi - lo) }
}
