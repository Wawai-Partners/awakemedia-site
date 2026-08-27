import Reveal from './Reveal'

export default function SectionStatement() {
  return (
    <section className="snap-section flex min-h-screen flex-col justify-center px-5 pb-12 pt-header supports-[height:100svh]:min-h-[100svh] sm:px-8 md:px-12 md:pb-16">
      {/* statement: rounded corner brackets */}
      <Reveal delay={120}>
        <div className="relative mx-auto max-w-6xl px-4 py-10 text-center sm:px-12 sm:py-16">
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l border-t border-white/25 sm:h-12 sm:w-12 sm:rounded-tl-3xl"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b border-r border-white/25 sm:h-12 sm:w-12 sm:rounded-br-3xl"
          />

          <p className="text-lg font-normal leading-[1.45] tracking-tight text-white drop-shadow-lg sm:text-2xl sm:leading-[1.3] md:text-3xl lg:text-4xl">
            Website services are fulfilled by the team at Awake Media who bring decades of design
            and web technology expertise, a streamlined design-to-launch process, stable managed
            WordPress hosting platform, and ongoing support and media services at non-profit rates.
            Not to mention entheogenic experience, so we understand the ineffable.
          </p>
        </div>
      </Reveal>
    </section>
  )
}
