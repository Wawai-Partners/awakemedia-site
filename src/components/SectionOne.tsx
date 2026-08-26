import { ChevronRight } from 'lucide-react'
import Reveal from './Reveal'
import { REGISTER_DOMAIN_URL, START_HERE_URL } from '../links'

export default function SectionOne() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-5 pb-12 pt-24 text-center supports-[height:100svh]:min-h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16">
      <Reveal delay={200}>
        <h1 className="max-w-7xl text-6xl font-bold leading-[1.05] tracking-normal text-white drop-shadow-lg sm:text-7xl md:text-8xl">
          LAUNCH YOUR WEBSITE OR PODCAST
        </h1>
      </Reveal>

      <Reveal delay={300}>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 drop-shadow-md sm:text-lg">
          Websites and podcasts for the entheogenic community, built by the team at Awake Media.
        </p>
      </Reveal>

      <Reveal delay={380}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={START_HERE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-white px-8 py-4 text-base font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:text-lg"
          >
            Start Here
            <ChevronRight size={14} />
          </a>
          <a
            href={REGISTER_DOMAIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-base text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/20 sm:text-lg"
          >
            Register a New domain
            <ChevronRight size={14} />
          </a>
        </div>
      </Reveal>
    </section>
  )
}
