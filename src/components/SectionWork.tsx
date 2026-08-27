import { useEffect, useRef, useState } from 'react'
import Reveal from './Reveal'
import SnapSteps from './SnapSteps'
import { onScrollFrame, runwayProgress } from '../scroll'
import imgProductStrat from '../images/aN5_a55xUNkB1acx_01.ProductStrat.avif'
import imgAppWeb from '../images/aN5_bZ5xUNkB1acy_02.App&Web.avif'
import imgBrand from '../images/aN5_b55xUNkB1acz_03.Brand.avif'
import imgBiosciences from '../images/Integrated_Biosciences-176-2048x1366.jpg'

/** Four supplied images cycled across ten rows: see note in the handover. */
const IMAGES = [imgProductStrat, imgAppWeb, imgBrand, imgBiosciences]

const GAP = 8
/** Open panel takes this share of the row; the rest is the pile + next panel. */
const ACTIVE_SHARE = 0.55

/**
 * Geometry derived from the measured row width rather than fixed pixels. Fixed
 * values only fill the row at one viewport size: on a wide screen a hard-coded
 * pile left ~590px of dead space at the last item.
 *
 * peek = (rowW - activeW) / (n - 1) makes the arithmetic close at both ends:
 *   last item  -> pile (rowW - activeW) + activeW  = rowW
 *   first item -> activeW + GAP + collapsedW       = rowW
 * In between, upcoming panels run past the right edge, which is the intent.
 */
function geometry(rowW: number, count: number) {
  const activeW = Math.round(rowW * ACTIVE_SHARE)
  const collapsedW = Math.max(0, rowW - activeW - GAP)
  const peek = count > 1 ? (rowW - activeW) / (count - 1) : 0
  return { activeW, collapsedW, peek }
}

function offsetFor(i: number, active: number, g: ReturnType<typeof geometry>) {
  if (i <= active) return i * g.peek
  return active * g.peek + g.activeW + GAP + (i - active - 1) * (g.collapsedW + GAP)
}

function widthFor(i: number, active: number, g: ReturnType<typeof geometry>) {
  return i === active ? g.activeW : g.collapsedW
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Panel box at a fractional scroll position. Snapping to whole indices and
 * animating the gap with a 500ms transition made the strip move in eight
 * discrete lurches that always trailed the wheel. Interpolating between the
 * layout at floor(pos) and ceil(pos) tracks the scroll 1:1 instead.
 */
function boxAt(i: number, pos: number, g: ReturnType<typeof geometry>, count: number) {
  const lo = Math.max(0, Math.min(count - 1, Math.floor(pos)))
  const hi = Math.max(0, Math.min(count - 1, lo + 1))
  const t = pos - lo
  return {
    x: lerp(offsetFor(i, lo, g), offsetFor(i, hi, g), t),
    w: lerp(widthFor(i, lo, g), widthFor(i, hi, g), t),
  }
}

const WORK = [
  {
    index: '01',
    title: 'Logo Design',
    body: 'A mark that holds up at every size, favicon to banner, handed over with the source files so you are never locked out of your own brand.',
  },
  {
    index: '02',
    title: 'Podcast Brands & Episode Production',
    body: 'Cover art, intro beds and episode assembly. You record; we hand back something ready to publish.',
  },
  {
    index: '03',
    title: 'Web Design & Development',
    body: 'Design and build in one pass, so what you approve is what actually ships, with no redraw between the two.',
  },
  {
    index: '04',
    title: 'Content Creation',
    body: 'Copy, stills and graphics made for the channels you actually post to, not leftovers repurposed to fill a grid.',
  },
  {
    index: '05',
    title: 'Audio & Video Production',
    body: 'Shot, cut and mixed end to end, with the sound treated as carefully as the picture.',
  },
  {
    index: '06',
    title: 'eCommerce & Booking Systems',
    body: 'Carts, checkouts and calendars wired up and tested, so orders and appointments land somewhere you can act on them.',
  },
  {
    index: '07',
    title: 'Email & Social Media Marketing',
    body: 'Campaigns built on your own list and cadence, measured against what you sell rather than vanity counts.',
  },
  {
    index: '08',
    title: 'Filmmaking',
    body: 'Longer-form work from treatment through final grade, for when a short clip cannot carry the story.',
  },
]

/**
 * Where the page may come to rest inside this section: exactly one per item,
 * at the same offsets goTo() aims at, so a click and a scroll agree.
 */
const SNAP_AT = Array.from({ length: WORK.length }, (_, i) => i / (WORK.length - 1))

export default function SectionWork() {
  // Only the whole-number item is React's business. `pos` is continuous and
  // drives eight inline transforms: as state it re-rendered this section and
  // reconciled all eight panels on every frame of the scroll, which was the
  // single most expensive thing on the page while it moved.
  const [active, setActive] = useState(0)
  // The stacking layout only exists from lg. Tracked in JS because the offset
  // has to be a real inline transform value, not a CSS variable: `transition`
  // cannot interpolate a custom property, so a var-based transform freezes at
  // its first value.
  const [isWide, setIsWide] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  /** Mirrors isWide for the frame callback, which never re-closes over state. */
  const wideRef = useRef(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      wideRef.current = query.matches
      setIsWide(query.matches)
      // Leaving the wide layout has to hand the panels back to CSS; an inline
      // transform and width from the strip would otherwise survive into the
      // stacked layout and pin every card to the first one's box.
      if (!query.matches) {
        for (const node of itemRefs.current) {
          if (!node) continue
          node.style.transform = ''
          node.style.width = ''
        }
      }
    }
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  // Scroll drives the strip. This is pin-and-scrub, not scroll-jacking: the
  // wheel is never intercepted, we only read where the page already is.
  useEffect(() => {
    const el = sectionRef.current
    const list = listRef.current
    if (!el || !list) return

    // Cached rather than read per frame: getBoundingClientRect and
    // contentRect.width both force a layout to answer, and this ran every
    // frame alongside the writes below, which is the classic thrash.
    let top = 0
    let height = 0
    let rowW = 0
    const measure = () => {
      top = el.offsetTop
      height = el.offsetHeight
      rowW = list.clientWidth
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    observer.observe(list)

    let lastActive = -1
    let lastPos = -1

    const unsubscribe = onScrollFrame(({ y, vh, moved }) => {
      if (!moved && lastPos >= 0) return
      const progress = height - vh <= 0 ? 0 : runwayProgress(top, height, y, vh)
      const pos = progress * (WORK.length - 1)

      const next = Math.round(pos)
      if (next !== lastActive) {
        lastActive = next
        setActive(next)
      }

      // Exact, not quantised: rounding the comparison left the rail stopping
      // at 99.97% and the last panel two pixels short. This still skips every
      // frame scrolled outside this section's runway, where progress is
      // clamped and pos does not actually change, which is what the guard is
      // here for.
      if (pos === lastPos) return
      lastPos = pos

      const rail = railRef.current
      if (rail) rail.style.width = `${((pos + 1) / WORK.length) * 100}%`

      // The stacking geometry only exists from lg; below it the panels are a
      // plain stack and must keep their CSS-driven size.
      if (!wideRef.current || rowW <= 0) return
      const g = geometry(rowW, WORK.length)
      for (let i = 0; i < WORK.length; i++) {
        const node = itemRefs.current[i]
        if (!node) continue
        const box = boxAt(i, pos, g, WORK.length)
        node.style.transform = `translateX(${box.x}px)`
        node.style.width = `${box.w}px`
      }
    })

    return () => {
      unsubscribe()
      observer.disconnect()
    }
  }, [])

  /**
   * Click and keyboard focus scroll to the item instead of setting state
   * directly: scroll owns `active`, so setting it here would be overwritten by
   * the next scroll event and the control would appear broken.
   */
  const goTo = (index: number) => {
    // Below lg there is no scrub runway and every card is already on screen,
    // so scrolling the page on tap or focus would be a hijack, not navigation.
    if (!isWide) return
    const el = sectionRef.current
    if (!el) return
    const scrubDistance = el.offsetHeight - window.innerHeight
    if (scrubDistance <= 0) return
    // Aim at the middle of the item's band so it lands solidly on that item.
    const offset = (index / (WORK.length - 1)) * scrubDistance
    window.scrollTo({ top: el.offsetTop + offset })
  }

  return (
    // Tall on purpose: the extra height is the scroll runway that steps through
    // the eight items while the panel below stays pinned. ~50vh per item.
    <section ref={sectionRef} id="additional-services" className="relative lg:h-[420vh]">
      <SnapSteps at={SNAP_AT} />
      {/* Below lg this is a plain block in normal flow. It used to be a pinned
          h-screen flex column with the eight cards as flex children: they were
          shrunk to nothing to fit, so the whole section rendered as an empty
          glass box with 420vh of dead scroll behind it. */}
      <div className="flex flex-col justify-center gap-8 px-5 pb-16 pt-header sm:px-8 md:px-12 lg:sticky lg:top-0 lg:h-screen lg:pb-16 lg:supports-[height:100svh]:h-[100svh]">
        {/* Heading left, supporting copy right. Stacks below lg, where there is
            no room to sit them side by side. */}
        <div className="flex flex-col gap-6 lg:shrink-0 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <Reveal delay={180}>
            <h2 className="max-w-xl text-3xl font-bold leading-[1.08] tracking-normal text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
              ADDITIONAL SERVICES AVAILABLE
            </h2>
          </Reveal>

          <Reveal delay={230} className="lg:max-w-md lg:shrink-0">
            <div className="space-y-3 text-sm leading-relaxed text-white/80 drop-shadow-md sm:text-base lg:text-right">
              <p>
                Additional digital media services are available through Awake Media at 30%
                discounted rates for Awake.net members.
              </p>
              <p>
                To order services directly visit AwakeMedia.com or after checkout you will be
                redirected to a page to collect details about your website where you can indicate
                which services you want.
              </p>
            </div>
          </Reveal>
        </div>

        {/* The glass panel must sit OUTSIDE Reveal: Reveal applies a transform
            and will-change, which makes it a backdrop root: backdrop-filter
            inside one can only sample its own group, so the blur was inert.
            Bleeds past the section padding on the right (-mr) with no right
            border or rounding, so the strip row reads as continuing off-screen
            instead of ending in a boundary. */}
        {/* backdrop-blur only from lg. In the stacked layout the panel is a
            ~1700px column almost entirely covered by opaque card art, so the
            blur shows through in the 8px gutters alone and costs a re-raster
            of the whole column on every scrolled frame to do it. */}
        {/* lg:flex-1 + lg:min-h-0, and the strip below sizes to it. The strip
            used to be a hard 520px inside this box, but `overflow-hidden`
            makes a flex item's `min-height: auto` resolve to zero, so the box
            shrank to whatever was left over - 474px at 1440x900, 214px at
            1280x600 - and clipped the difference off the bottom, which is
            exactly where justify-end puts each card's title and description. */}
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5 p-2 lg:-mr-12 lg:min-h-0 lg:flex-1 lg:rounded-r-none lg:border-r-0 lg:backdrop-blur-md">
          <Reveal delay={280} className="lg:h-full">
            {/* Below lg: a plain vertical stack. From lg: each panel is placed
                by transform, so passed items pile up on the left instead of
                sliding away. */}
            <ul ref={listRef} className="flex h-auto flex-col gap-2 lg:relative lg:block lg:h-full">
            {WORK.map((item, i) => {
              // Below lg every card is on screen at once, so "the current
              // one" has no meaning: give them all the open treatment rather
              // than singling one out at random.
              const open = isWide ? active === i : true
              // A control that looks tappable but does nothing is worse than no
              // control; below lg goTo is a no-op, so render plain content.
              const Card = isWide ? 'button' : 'div'
              return (
                <li
                  key={item.index}
                  ref={(node) => {
                    itemRefs.current[i] = node
                  }}
                  // Later panels sit above earlier ones so the left-hand pile
                  // reads as a deck, newest card on top. The transform and
                  // width are written by the scroll effect, not from render.
                  style={{ zIndex: i }}
                  className="relative h-44 shrink-0 overflow-hidden rounded-xl sm:h-52 lg:absolute lg:left-0 lg:top-0 lg:h-full lg:shrink"
                >
                  <img
                    src={IMAGES[i % IMAGES.length]}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Scrim: type sits directly on the photo, so it needs its own
                      ground rather than relying on the panel tint. */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      open
                        ? 'bg-gradient-to-t from-black/95 via-black/70 to-black/35'
                        : 'bg-black/70'
                    }`}
                  />

                  {/* From lg a real button, so the strip works by touch and
                      keyboard rather than hover alone. */}
                  <Card
                    {...(isWide
                      ? {
                          type: 'button' as const,
                          onFocus: () => goTo(i),
                          onClick: () => goTo(i),
                          // Not aria-expanded: nothing collapses any more: every
                          // description stays on screen: so this is "the current
                          // one of a set", which is what aria-current means.
                          'aria-current': open,
                        }
                      : {})}
                    // Collapsed strips get tighter padding: at lg:p-5 the content
                    // box is only ~89px and a 16px label overflows it.
                    className={`absolute inset-0 flex flex-col justify-end gap-1.5 overflow-hidden p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 sm:gap-2 ${
                      open ? 'lg:p-5' : 'lg:p-3'
                    }`}
                  >
                    <span
                      className={`font-mono tabular-nums drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] transition-all duration-300 ${
                        open ? 'text-sm text-white lg:text-base' : 'text-sm text-white/85 lg:text-base'
                      }`}
                    >
                      {item.index}
                    </span>
                    {/* Panels are 560px wide now, so the title fits horizontally
                        again: the number-only compromise was only needed while
                        collapsed strips were ~44px. Stacked panels keep their
                        title too; the overlap simply clips it. */}
                    {/* line-clamp from lg only: the strip now sizes to the
                        window, so on a short one the text has to give way at a
                        line boundary instead of being sliced through. The
                        stacked layout below lg has fixed card heights the copy
                        already fits, so it keeps every line. */}
                    <span
                      className={`font-medium leading-snug tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] lg:line-clamp-2 ${
                        open ? 'text-base sm:text-lg lg:text-2xl' : 'text-base lg:text-lg'
                      }`}
                    >
                      {item.title}
                    </span>
                    <p
                      // Always shown. Panels are wide enough to carry it now, and
                      // the left-hand pile simply clips what it overlaps.
                      className="max-w-md text-[13px] leading-snug text-white/85 drop-shadow-md sm:text-sm sm:leading-relaxed lg:line-clamp-3"
                    >
                      {item.body}
                    </p>
                  </Card>
                </li>
              )
            })}
            </ul>
          </Reveal>
        </div>

        {/* Purple progress rail: the only cue that this section holds more than
            what is on screen, since the page scroll is what advances it. */}
        <div
          className="hidden lg:-mr-12 lg:block lg:shrink-0"
          role="progressbar"
          aria-label="Service list position"
          aria-valuemin={1}
          aria-valuemax={WORK.length}
          aria-valuenow={active + 1}
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div ref={railRef} className="h-full rounded-full bg-violet-500" />
          </div>
        </div>
      </div>
    </section>
  )
}
