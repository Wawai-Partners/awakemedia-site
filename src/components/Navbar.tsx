import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Reveal from './Reveal'
import { onScrollFrame } from '../scroll'
import { START_HERE_URL } from '../links'

const LINKS = [
  { label: "What's Included", href: '#whats-included' },
  { label: 'Additional Services', href: '#additional-services' },
  // Labelled for what the section actually says: which membership levels get
  // web development, and what upgrading adds.
  { label: 'Membership Levels', href: '#membership' },
]

/** Past this many pixels the bar earns its own surface. */
const SOLID_AFTER = 24

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // The header is transparent over the hero by design, but the page scrolls
  // *under* it: without a surface, body copy collides with the logo and the
  // CTA and both become unreadable. Fade one in once the hero is behind us.
  useEffect(
    () => onScrollFrame(({ y }) => setScrolled(y > SOLID_AFTER)),
    [],
  )

  // The drawer covers the page, so the page behind it must not scroll: on iOS
  // a scrollable body under a fixed overlay is what makes the overlay drift.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Only ever opened below lg; if the viewport grows past the breakpoint while
  // it is open the drawer would be stranded on screen with no way to close it.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      if (query.matches) setOpen(false)
    }
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-safe pt-safe">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 border-b bg-[#0a0a0a]/80 backdrop-blur-md transition-opacity duration-300 ${
          scrolled || open ? 'border-white/10 opacity-100' : 'border-transparent opacity-0'
        }`}
      />

      <div className="relative flex items-center justify-between gap-3 px-5 py-3 sm:px-8 sm:py-4 md:px-12">
        <Reveal delay={0} trigger="mount">
          {/* min-h-11: the logo art is only 36px tall on a phone, which is under
                the 44px comfortable-tap floor for the one link that goes home. */}
          <a href="#" className="flex min-h-11 items-center text-white">
            {/* h-14 left roughly 40px between the logo and the CTA at 375px.
                Step it down on phones so the two stop crowding each other. */}
            <img
              src={`${import.meta.env.BASE_URL}AMLOGO2022_03.png`}
              alt="Awake Media"
              className="h-9 w-auto sm:h-14 md:h-16 lg:h-20"
            />
          </a>
        </Reveal>

        {/* centre pill: links + language selector */}
        {/* Back to lg: with three links and no language chip the pill is 509px,
            and 1024px leaves 611px between the logo and the CTA. The xl gate was
            sized for the old five-link pill and now hides the menu for nothing. */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 backdrop-blur-md lg:flex xl:gap-8 xl:px-8">
          {LINKS.map((link, i) => (
            <Reveal key={link.label} delay={100 + i * 100} trigger="mount">
              <a
                href={link.href}
                className="whitespace-nowrap text-base text-white/85 transition-colors duration-300 hover:text-white"
              >
                {link.label}
              </a>
            </Reveal>
          ))}

        </nav>

        <div className="flex items-center gap-2">
          <Reveal delay={700} trigger="mount">
            <a
              href={START_HERE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:px-8 sm:py-3.5 sm:text-lg"
            >
              Start Here
            </a>
          </Reveal>

          {/* Below lg the centre pill is hidden, which until now left the three
              in-page sections with no navigation at all on a phone. */}
          <Reveal delay={780} trigger="mount" className="lg:hidden">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition-colors duration-300 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 lg:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </Reveal>
        </div>
      </div>

      {/* Drawer. Rendered always so the open/close transition has both ends to
          animate between; `invisible` keeps it out of the tab order when shut. */}
      <div
        id="mobile-nav"
        className={`overflow-hidden px-5 transition-[max-height,opacity] duration-300 ease-out sm:px-8 lg:hidden ${
          open ? 'max-h-96 opacity-100' : 'invisible max-h-0 opacity-0'
        }`}
      >
        <nav className="mb-3 rounded-2xl border border-white/15 bg-[#0a0a0a]/90 p-2 backdrop-blur-md">
          <ul className="flex flex-col">
            {LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  tabIndex={open ? undefined : -1}
                  className="flex min-h-[48px] items-center rounded-xl px-4 text-base text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
