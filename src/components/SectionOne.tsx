import { ChevronRight } from 'lucide-react'
import Reveal from './Reveal'
import { REGISTER_DOMAIN_URL, START_HERE_URL } from '../links'

export default function SectionOne() {
  return (
    <section className="snap-section flex min-h-screen flex-col items-center justify-center px-5 pb-12 pt-header text-center supports-[height:100svh]:min-h-[100svh] sm:px-8 md:px-12 md:pb-16">
      <Reveal delay={200}>
        {/* text-6xl on a 375px screen wrapped to five lines and pushed both CTAs
            past the fold. Start at 36px and only scale up once there is room. */}
        <h1 className="max-w-7xl text-4xl font-bold leading-[1.05] tracking-normal text-white drop-shadow-lg sm:text-6xl md:text-7xl lg:text-8xl">
          LAUNCH YOUR WEBSITE OR PODCAST
        </h1>
      </Reveal>

      <Reveal delay={300}>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 drop-shadow-md sm:mt-6 sm:text-lg">
          Websites and podcasts for the entheogenic community, built by the team at Awake Media.
        </p>
      </Reveal>

      {/* The domain-registration link's blurred surface sits outside Reveal on
          purpose: Reveal applies a transform (and, mid-transition,
          will-change), which makes its own box a backdrop root. backdrop-
          filter inside one can then only sample that root's own near-empty
          layer instead of the real scrolling footage behind it, which reads
          as a stale/delayed blur. Revealing the row's position while leaving
          the blurred link itself untransformed keeps the blur live. */}
      <div className="mx-auto mt-7 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mt-8 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        <Reveal delay={380}>
          <a
            href={START_HERE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[52px] items-center justify-center gap-1 rounded-full bg-white px-8 py-4 text-base font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:text-lg"
          >
            Start Here
            <ChevronRight size={14} />
          </a>
        </Reveal>
        <div className="rounded-full backdrop-blur-md">
          <Reveal delay={420}>
            <a
              href={REGISTER_DOMAIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center gap-1 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-base text-white transition-colors duration-300 hover:bg-white/20 sm:text-lg"
            >
              Register a New domain
              <ChevronRight size={14} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
