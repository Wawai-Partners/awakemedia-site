import Reveal from './Reveal'

const CHECK_ICON =
  'https://cdn.prod.website-files.com/6720dd1ab6df0da205830ab1/686cc068490683bbb3377d04_bullet-list.svg'

/** The original ten "What's Included" items, split 5/5 across the two columns. */
const INCLUDED_LEFT = [
  'Domain Name Registration',
  'Hosting Setup',
  'Email Setup',
  'WordPress Pre-Installed',
  'Divi Premium Theme ($90 value)',
]

const INCLUDED_RIGHT = [
  'Security, Backup & Speed Plugins',
  'Contact Form & SMTP Activation',
  'Video Tutorial Walk-Through',
  'Ongoing Daily Maintenance',
  'Website Workshop Access',
]

function IncludedCard({ title, delay }: { title: string; delay: number }) {
  return (
    // The blur surface sits outside Reveal on purpose: Reveal applies a
    // transform (and, mid-transition, will-change), which makes its own box a
    // backdrop root. backdrop-filter inside one can then only sample that
    // root's own near-empty layer instead of the real scrolling footage behind
    // it, which is what made the blur look stale/delayed. Revealing the text
    // alone, inside an already-blurred, untransformed card, keeps the blur
    // live while still letting the copy animate in.
    <div
      className="h-full overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-md"
    >
      <Reveal delay={delay} className="flex h-full items-center">
        <div
          className="flex items-center"
          style={{ gap: '14px', padding: 'clamp(14px, 1.2vw, 20px) clamp(16px, 1.4vw, 24px)' }}
        >
          <img
            src={CHECK_ICON}
            alt=""
            aria-hidden="true"
            style={{ width: 'clamp(20px, 1.6vw, 26px)', flexShrink: 0 }}
          />
          <div className="font-medium leading-snug text-white/90">{title}</div>
        </div>
      </Reveal>
    </div>
  )
}

export default function SectionTwo() {
  return (
    <section
      id="whats-included"
      className="snap-section flex flex-col items-center justify-center gap-6 px-5 py-12 pt-header sm:px-8 sm:gap-8 md:px-12 md:pb-16 lg:min-h-screen lg:supports-[height:100svh]:min-h-[100svh]"
    >
      <Reveal delay={120} className="w-full text-center">
        <h2
          className="font-bold uppercase text-white"
          style={{ fontSize: 'clamp(36px, 4.6vw, 64px)', lineHeight: 1.15, margin: 0 }}
        >
          What&rsquo;s Included
        </h2>
      </Reveal>

      <div
        className="grid w-full max-w-5xl grid-cols-1 sm:grid-cols-2 sm:grid-flow-col"
        style={{
          columnGap: '32px',
          rowGap: '12px',
          gridTemplateRows: `repeat(${INCLUDED_LEFT.length}, auto)`,
          padding: '0 clamp(0px, 2.92vw, 40px)',
          fontSize: 'clamp(16px, 1.5vw, 22px)',
        }}
      >
        {INCLUDED_LEFT.map((title, i) => (
          <IncludedCard key={title} title={title} delay={160 + i * 20} />
        ))}

        {INCLUDED_RIGHT.map((title, i) => (
          <IncludedCard key={title} title={title} delay={160 + i * 20} />
        ))}
      </div>
    </section>
  )
}
