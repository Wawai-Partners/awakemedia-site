import { ChevronRight } from 'lucide-react'
import Reveal from './Reveal'
import { START_HERE_URL } from '../links'

export default function SectionClose() {
  return (
    <section id="membership" className="snap-section flex min-h-screen flex-col justify-between px-5 pt-header pb-[max(3rem,env(safe-area-inset-bottom))] supports-[height:100svh]:min-h-[100svh] sm:px-8 md:px-12 md:pb-16">
      {/* testimonial */}
      <div className="flex flex-1 flex-col justify-center">
        <Reveal delay={220}>
          <p className="max-w-3xl text-xl font-normal leading-[1.35] tracking-tight text-white drop-shadow-lg sm:text-3xl sm:leading-[1.25] lg:text-4xl">
            Web development services available for all membership levels, upgrade to Mediamakers or
            Mentors &amp; Masters to include hosting and email without extra charge.
          </p>
        </Reveal>

        <Reveal delay={340}>
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
            <a
              href={START_HERE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] w-full max-w-sm items-center justify-center gap-1 rounded-full bg-white px-8 py-4 text-base font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:w-auto sm:text-lg"
            >
              Start Here
              <ChevronRight size={14} />
            </a>
          </div>
        </Reveal>
      </div>

      {/* footer */}
      <Reveal delay={200}>
        <footer className="relative mt-12 sm:mt-16">
          {/* Dark scrim: the scroll video is at its brightest frame here, so the
              footer needs its own surface rather than relying on drop-shadow. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-5 -bottom-12 top-0 bg-gradient-to-t from-black/95 via-black/90 to-black/60 backdrop-blur-md sm:-inset-x-8 md:-inset-x-12 md:-bottom-16"
          />

          <div className="relative border-t border-white/20 pt-8 sm:pt-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-16">
            <img
              src={`${import.meta.env.BASE_URL}AMLOGO2022_03.png`}
              alt="Awake Media"
              className="h-10 w-auto shrink-0 self-start sm:h-14 md:h-16"
            />
            <p className="text-sm leading-relaxed text-white/80 md:max-w-xl md:text-right">
              AwakeMedia is a 501c3 non-profit social impact network for the entheogenic community.
              All profits benefit FEAT, the Friends for Entheogenic Addiction Treatment and our
              mission to end addiction and save lives. &copy; 2026 All rights reserved. Awake.net
              Corporation.
            </p>
          </div>
          </div>
        </footer>
      </Reveal>
    </section>
  )
}
