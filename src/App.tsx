import { useCallback, useState } from 'react'
import Navbar from './components/Navbar'
import Preloader from './components/Preloader'
import ScrollVideo from './components/ScrollVideo'
import { RevealOriginProvider } from './components/Reveal'
import SectionOne from './components/SectionOne'
import SectionStatement from './components/SectionStatement'
import SectionTwo from './components/SectionTwo'
import SectionWork from './components/SectionWork'
import SectionClose from './components/SectionClose'

const HERO_VIDEO = `${import.meta.env.BASE_URL}hero-fluid.mp4`

export default function App() {
  const [revealed, setRevealed] = useState(false)
  const reveal = useCallback(() => setRevealed(true), [])

  return (
    <div className="relative">
      {/* Mounts immediately, behind the curtain: its frame cache is the thing
          the preloader's bar is actually measuring. */}
      <ScrollVideo src={HERO_VIDEO} />

      <Preloader onReveal={reveal} />

      {/* Held back until the curtain starts lifting, so the site's own entrance
          plays into the gap rather than finishing unseen behind the cover. */}
      {revealed ? (
      <div className="relative z-10">
        {/* Plain rise: the navbar sits outside main's overflow clip, so a
            sideways entry would spill and create a horizontal scrollbar. */}
        <RevealOriginProvider origin="bottom">
          <Navbar />
        </RevealOriginProvider>
        <main>
          {/* Entry corner alternates section to section. */}
          <RevealOriginProvider origin="top-left">
            <SectionOne />
          </RevealOriginProvider>
          <RevealOriginProvider origin="bottom-right">
            <SectionStatement />
          </RevealOriginProvider>
          <RevealOriginProvider origin="top-left">
            <SectionTwo />
          </RevealOriginProvider>
          <RevealOriginProvider origin="bottom-right">
            <SectionWork />
          </RevealOriginProvider>
          {/* Footer section: straight fade-up, no rotation. */}
          <RevealOriginProvider origin="bottom">
            <SectionClose />
          </RevealOriginProvider>
        </main>
      </div>
      ) : null}
    </div>
  )
}
