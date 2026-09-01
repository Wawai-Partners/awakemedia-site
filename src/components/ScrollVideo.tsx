import { useEffect, useRef, useState } from 'react'
import { onScrollFrame } from '../scroll'

type ScrollVideoProps = {
  src: string
  poster?: string
}

const MAX_FRAMES = 90
const MIN_FRAMES = 24
const FRAMES_PER_SECOND = 12
const MAX_FRAME_WIDTH = 960
/**
 * Phone budget. The desktop cache is 90 bitmaps at 960px wide, which is on the
 * order of 190MB of decoded RGBA held live: enough to get the tab killed on
 * iOS, and the extraction itself competes with the first paint. A phone screen
 * cannot resolve 960px of a background layer anyway, and 36 frames over the
 * clip is still smoother than the scroll it is tied to.
 */
/**
 * Raised from 36 now that the painter dissolves between frames: 36 left 0.89s
 * of footage between neighbours, which is long enough for the blend to read as
 * a double exposure rather than motion. 54 halves that to 0.59s and costs about
 * 35MB, still a fraction of the ~190MB that made the original budget a problem.
 */
const MOBILE_MAX_FRAMES = 54
const MOBILE_MAX_FRAME_WIDTH = 540
const MOBILE_BREAKPOINT = 768

/** Frame budget for this device. Read once, at extraction time. */
function frameBudget() {
  if (typeof window === 'undefined') return { maxFrames: MAX_FRAMES, maxWidth: MAX_FRAME_WIDTH }
  const narrow = window.innerWidth < MOBILE_BREAKPOINT
  const coarse = window.matchMedia('(pointer: coarse)').matches
  return narrow || coarse
    ? { maxFrames: MOBILE_MAX_FRAMES, maxWidth: MOBILE_MAX_FRAME_WIDTH }
    : { maxFrames: MAX_FRAMES, maxWidth: MAX_FRAME_WIDTH }
}
const LERP = 0.12
const SEEK_EPSILON = 0.04
/** Dark veil over the footage so white type stays legible. See usage below. */
const VEIL = 'bg-black/50'

function isCrossOrigin(url: string) {
  return /^https?:\/\//i.test(url) && !url.startsWith(window.location.origin)
}

function seekTo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      video.removeEventListener('seeked', finish)
      resolve()
    }
    video.addEventListener('seeked', finish)
    video.currentTime = time
    // Guard against browsers that never fire `seeked` for a no-op seek.
    window.setTimeout(finish, 2000)
  })
}

/**
 * Full-bleed background whose playhead is driven by page scroll only.
 * Poster -> <video> -> <canvas> crossfade; the canvas paints pre-extracted
 * frames once the cache is warm, otherwise the <video> is seeked directly.
 */
export default function ScrollVideo({ src, poster }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<ImageBitmap[]>([])
  const targetRef = useRef(0)
  const smoothedRef = useRef(0)

  const [hasFrame, setHasFrame] = useState(false)
  const [framesReady, setFramesReady] = useState(false)
  /**
   * The <video> exists only to hold the screen until the frame cache is warm.
   * Once the canvas is driving, a mounted element still pins its decoder and
   * the buffered clip - which is 27MB here - in memory for the life of the
   * page, on the device least able to spare it. Unmount it, one crossfade
   * after the canvas takes over.
   */
  const [videoRetired, setVideoRetired] = useState(false)

  // ---- scroll progress -----------------------------------------------------
  // Rides the shared ticker: the page height and viewport come already
  // measured, so this no longer reads scrollHeight on every scroll event.
  useEffect(
    () =>
      onScrollFrame(({ y, vh, pageHeight }) => {
        const max = pageHeight - vh
        const progress = max > 0 ? y / max : 0
        targetRef.current = Math.min(1, Math.max(0, progress))
      }),
    [],
  )

  // ---- canvas sizing -------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h || (canvas.width === w && canvas.height === h)) return
      canvas.width = w
      canvas.height = h
      // Resizing the backing store resets context state, so re-apply the DPR
      // transform. The render loop notices the changed client size and
      // repaints on the next frame.
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  // A new clip starts the handover over again.
  useEffect(() => {
    setHasFrame(false)
    setFramesReady(false)
    setVideoRetired(false)
  }, [src])

  useEffect(() => {
    if (!framesReady) return
    // FADE_MS, so the handover is a crossfade rather than a cut.
    const id = window.setTimeout(() => setVideoRetired(true), 600)
    return () => window.clearTimeout(id)
  }, [framesReady])

  // ---- first decoded frame -------------------------------------------------
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (video.readyState >= 2) {
      setHasFrame(true)
      return
    }
    const onLoaded = () => setHasFrame(true)
    video.addEventListener('loadeddata', onLoaded)
    return () => video.removeEventListener('loadeddata', onLoaded)
  }, [])

  // ---- render loop ---------------------------------------------------------
  useEffect(() => {
    // Read once per effect rather than per frame; a preference change is rare
    // and a reload is an acceptable cost for it. Under reduced motion nothing
    // is scrubbed and no frame cache is built, so there is nothing to drive:
    // the footage rests on its first frame as a still backdrop and the loop
    // would be a no-op burning battery every frame.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /**
     * What is currently on the canvas, so an unchanged picture is not
     * repainted. Keyed on the blend position rather than a frame index: the
     * picture now changes continuously between two cached frames.
     */
    let paintedKey = -1
    let paintedW = 0
    let paintedH = 0

    const drawCover = (
      ctx: CanvasRenderingContext2D,
      source: CanvasImageSource,
      sw: number,
      sh: number,
      cw: number,
      ch: number,
    ) => {
      if (!sw || !sh || !cw || !ch) return
      const scale = Math.max(cw / sw, ch / sh)
      const dw = sw * scale
      const dh = sh * scale
      ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
    }

    const tick = () => {
      smoothedRef.current += (targetRef.current - smoothedRef.current) * LERP
      const progress = smoothedRef.current

      const frames = framesRef.current
      const canvas = canvasRef.current

      if (frames.length && canvas) {
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const cw = canvas.clientWidth
        const ch = canvas.clientHeight

        /**
         * Blend the two cached frames either side of the playhead instead of
         * snapping to the nearest one.
         *
         * The cache is 32 seconds of footage in 54 to 90 frames, spread over
         * the whole page: one frame per ~105px of scroll on a desktop, ~170px
         * on a phone. Snapping meant the picture only ever changed once every
         * hundred-odd pixels, so the background read as a slideshow at two or
         * three frames a second no matter how smoothly the page scrolled. The
         * fix cannot be more frames - ninety at 960px is already on the order
         * of 190MB of decoded RGBA - so it is a dissolve between the two
         * neighbours, weighted by where the playhead sits between them. Same
         * memory, one extra blit.
         */
        const pos = progress * (frames.length - 1)
        const lo = Math.min(frames.length - 1, Math.max(0, Math.floor(pos)))
        const hi = Math.min(frames.length - 1, lo + 1)
        const blend = pos - lo

        // 1/64 of the gap between two frames is well under what the eye
        // resolves, and skipping those saves the blits when the page is still.
        const key = lo * 64 + Math.round(blend * 64)
        if (key === paintedKey && cw === paintedW && ch === paintedH) return
        paintedKey = key
        paintedW = cw
        paintedH = ch

        const a = frames[lo]
        ctx.clearRect(0, 0, cw, ch)
        drawCover(ctx, a, a.width, a.height, cw, ch)

        if (hi !== lo && blend > 0) {
          const b = frames[hi]
          ctx.globalAlpha = blend
          drawCover(ctx, b, b.width, b.height, cw, ch)
          ctx.globalAlpha = 1
        }
        return
      }

      // Fallback: scrub the visible <video> element directly.
      const video = videoRef.current
      if (video && video.readyState >= 2 && Number.isFinite(video.duration)) {
        const time = progress * Math.max(0, video.duration - 0.05)
        if (Math.abs(video.currentTime - time) > SEEK_EPSILON) {
          try {
            video.currentTime = time
          } catch {
            /* seek not ready yet */
          }
        }
      }
    }

    return onScrollFrame(tick)
  }, [])

  // ---- frame cache extraction ---------------------------------------------
  useEffect(() => {
    let cancelled = false
    let extractor: HTMLVideoElement | null = null

    const start = async () => {
      // A scroll-driven background is the motion this preference asks to be
      // spared; extracting a frame cache to power it is pure cost.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // Let the visible video get its first frame up before we compete for
      // bandwidth / decode time.
      await new Promise<void>((resolve) => {
        const video = videoRef.current
        // No element to wait on (already retired after an earlier cache):
        // go straight to extracting rather than waiting for an event that
        // can never fire.
        if (!video || video.readyState >= 2) {
          resolve()
          return
        }
        video.addEventListener('loadeddata', () => resolve(), { once: true })
      })
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      if (cancelled) return

      extractor = document.createElement('video')
      extractor.muted = true
      extractor.playsInline = true
      extractor.preload = 'auto'
      if (isCrossOrigin(src)) extractor.crossOrigin = 'anonymous'
      extractor.src = src

      await new Promise<void>((resolve, reject) => {
        extractor!.addEventListener('loadedmetadata', () => resolve(), { once: true })
        extractor!.addEventListener('error', () => reject(new Error('load')), { once: true })
      })
      if (cancelled) return

      const duration = extractor.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      const budget = frameBudget()
      const count = Math.min(
        budget.maxFrames,
        Math.max(Math.min(MIN_FRAMES, budget.maxFrames), Math.round(duration * FRAMES_PER_SECOND)),
      )

      const vw = extractor.videoWidth
      const vh = extractor.videoHeight
      const scale = Math.min(1, budget.maxWidth / vw)
      const fw = Math.round(vw * scale)
      const fh = Math.round(vh * scale)

      const scratch = document.createElement('canvas')
      scratch.width = fw
      scratch.height = fh
      const sctx = scratch.getContext('2d')
      if (!sctx) return

      const collected: ImageBitmap[] = []
      const span = Math.max(0, duration - 0.05)

      for (let i = 0; i < count; i++) {
        if (cancelled) break
        await seekTo(extractor, (i / (count - 1)) * span)
        if (cancelled) break
        sctx.drawImage(extractor, 0, 0, fw, fh)
        collected.push(await createImageBitmap(scratch))
      }

      if (cancelled) {
        collected.forEach((bitmap) => bitmap.close())
        return
      }

      framesRef.current = collected
      setFramesReady(true)
    }

    start().catch(() => {
      /* keep the <video> scrub fallback */
    })

    return () => {
      cancelled = true
      framesRef.current.forEach((bitmap) => bitmap.close())
      framesRef.current = []
      if (extractor) {
        extractor.removeAttribute('src')
        extractor.load()
      }
    }
  }, [src])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
      {poster ? (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            hasFrame || framesReady ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : null}

      {videoRetired ? null : (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            hasFrame && !framesReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
          framesReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Legibility veil. The footage is bright and saturated, so white type
          over raw frames drops well under AA. Tune VEIL to taste: lower is
          more vivid, higher is more readable. */}
      <div aria-hidden="true" className={`absolute inset-0 ${VEIL}`} />
    </div>
  )
}
