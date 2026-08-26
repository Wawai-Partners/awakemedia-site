import Reveal from './Reveal'

export default function SectionStatement() {
  return (
    <section className="flex min-h-screen flex-col justify-center px-5 pb-12 pt-24 supports-[height:100svh]:min-h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16">
      {/* statement: rounded corner brackets */}
      <Reveal delay={120}>
        <div className="relative mx-auto max-w-6xl px-6 py-14 text-center sm:px-12 sm:py-16">
          <span
            aria-hidden="true"
            className="absolute left-0 top-0 h-12 w-12 rounded-tl-3xl border-l border-t border-white/25"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-12 w-12 rounded-br-3xl border-b border-r border-white/25"
          />

          <p className="text-2xl font-normal leading-[1.3] tracking-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl">
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
