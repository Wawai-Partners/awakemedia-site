import Reveal from './Reveal'
import { START_HERE_URL } from '../links'

const LINKS = [
  { label: "What's Included", href: '#whats-included' },
  { label: 'Additional Services', href: '#additional-services' },
  // Labelled for what the section actually says: which membership levels get
  // web development, and what upgrading adds.
  { label: 'Membership Levels', href: '#membership' },
]


export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="relative flex items-center justify-between px-5 py-4 sm:px-8 md:px-12">
        <Reveal delay={0} trigger="mount">
          <a href="#" className="flex items-center text-white">
            <img src={`${import.meta.env.BASE_URL}AMLOGO2022_03.png`} alt="Awake Media" className="h-14 w-auto sm:h-16 lg:h-20" />
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

        <Reveal delay={700} trigger="mount">
          <a
            href={START_HERE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-white px-7 py-3.5 text-base font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:px-8 sm:text-lg"
          >
            Start Here
          </a>
        </Reveal>
      </div>
    </header>
  )
}
