/**
 * Snap points down a pinned section's scroll runway.
 *
 * The desktop page snaps so it always rests on one complete state. That works
 * for a section exactly one viewport tall, which has a single obvious resting
 * place, but the two scrubbed sections are four viewports tall: a lone snap
 * point at the top gives `mandatory` nowhere to rest inside them, so it drags
 * the reader from the section's start straight to the next section and every
 * intermediate item is scrolled past without ever being the thing on screen.
 *
 * These are the intermediate resting places: one invisible 1px target per item,
 * at the scroll offset that puts that item on stage. The CSS that gives them
 * `scroll-snap-align` is gated to the desktop layout, so below that they are
 * inert.
 *
 * Offsets are a percentage of the section's own height rather than a vh value,
 * which keeps the arithmetic independent of the unit the section is sized in
 * (both use 420 of it, vh or svh) and of the viewport size:
 *
 *   scrollY at progress p = sectionTop + p * (sectionHeight - viewport)
 *                         = sectionTop + p * (420u - 100u)
 *   as a fraction of sectionHeight (420u) = p * 320 / 420
 */

/** Section height and viewport, in the same unit the sections are sized in. */
const SECTION_UNITS = 420
const VIEWPORT_UNITS = 100

export default function SnapSteps({ at }: { at: number[] }) {
  return (
    <>
      {at.map((progress, i) => (
        <span
          key={i}
          aria-hidden="true"
          data-snap-step=""
          className="pointer-events-none absolute left-0 h-px w-px"
          style={{
            top: `${((progress * (SECTION_UNITS - VIEWPORT_UNITS)) / SECTION_UNITS) * 100}%`,
          }}
        />
      ))}
    </>
  )
}
