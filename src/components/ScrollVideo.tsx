import { useEffect, useRef, useState } from 'react'

type ScrollVideoProps = {
  src: string
  poster?: string
}

const MAX_FRAMES = 90
const MIN_FRAMES = 24
const FRAMES_PER_SECOND = 12
const MAX_FRAME_WIDTH = 960
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

  // ---- scroll progress -----------------------------------------------------
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? window.scrollY / max : 0
      targetRef.current = Math.min(1, Math.max(0, progress))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

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
      // transform and let the render loop repaint on the next frame.
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
    let raf = 0

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
      raf = requestAnimationFrame(tick)

      smoothedRef.current += (targetRef.current - smoothedRef.current) * LERP
      const progress = smoothedRef.current

      const frames = framesRef.current
      const canvas = canvasRef.current

      if (frames.length && canvas) {
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const index = Math.min(
          frames.length - 1,
          Math.max(0, Math.round(progress * (frames.length - 1))),
        )
        const bitmap = frames[index]
        const cw = canvas.clientWidth
        const ch = canvas.clientHeight
        ctx.clearRect(0, 0, cw, ch)
        drawCover(ctx, bitmap, bitmap.width, bitmap.height, cw, ch)
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

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---- frame cache extraction ---------------------------------------------
  useEffect(() => {
    let cancelled = false
    let extractor: HTMLVideoElement | null = null

    const start = async () => {
      // Let the visible video get its first frame up before we compete for
      // bandwidth / decode time.
      await new Promise<void>((resolve) => {
        const video = videoRef.current
        if (video && video.readyState >= 2) {
          resolve()
          return
        }
        video?.addEventListener('loadeddata', () => resolve(), { once: true })
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

      const count = Math.min(
        MAX_FRAMES,
        Math.max(MIN_FRAMES, Math.round(duration * FRAMES_PER_SECOND)),
      )

      const vw = extractor.videoWidth
      const vh = extractor.videoHeight
      const scale = Math.min(1, MAX_FRAME_WIDTH / vw)
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
