# Awake Media: Launch Your Website or Podcast

Single page marketing site for Awake Media, a 501c3 non-profit social impact
network for the entheogenic community.

Built with Vite, React, TypeScript and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on port 5199.

```bash
npm run build    # production build into dist/
```

## Hero video is not in this repo

The page background is a scroll-scrubbed video that the components expect at:

```
public/hero-fluid.mp4
```

That file is **not** committed. The master footage is 233 MiB and GitHub rejects
any single file over 100 MiB, so all video is excluded by `.gitignore`. After
cloning you need to supply it yourself, or the background renders as flat black
while the rest of the page still works.

The committed source is 4K and far too heavy to ship to browsers. Before
deploying, transcode it down to something a visitor can actually load:

```bash
ffmpeg -i source.mp4 -vf scale=1920:-2 -c:v libx264 -crf 26 -preset slow \
  -an -movflags +faststart public/hero-fluid.mp4
```

That lands around 5 to 12 MB. Audio is dropped with `-an` because the video is
decorative and muted, and `+faststart` lets playback begin before the whole file
has arrived.

## Structure

| Path | Purpose |
| --- | --- |
| `src/components/ScrollVideo.tsx` | Scroll-scrubbed video background, frame cache and canvas cover math |
| `src/components/Reveal.tsx` | Bidirectional scroll reveal primitive used across every section |
| `src/components/Navbar.tsx` | Fixed header, centre pill nav, Start Here CTA |
| `src/components/SectionOne.tsx` | Hero |
| `src/components/SectionStatement.tsx` | Statement with corner brackets |
| `src/components/SectionTwo.tsx` | What's Included, pinned and scrubbed through ten items |
| `src/components/SectionWork.tsx` | Additional Services, pinned filmstrip of eight services |
| `src/components/SectionClose.tsx` | Membership statement and footer |
| `src/links.ts` | Outbound URLs in one place |

Sections two and four use pin and scrub: a tall section with a `sticky` inner
panel, mapping scroll position onto component state. Scroll is never
intercepted, so the page keeps its native feel and `prefers-reduced-motion` is
honoured throughout.

## Known work outstanding

- Mobile layout has not had a refinement pass. Desktop was the agreed focus first.
- The favicon reuses the wordmark, which is 2.3:1, so it renders squished in a
  square slot. A dedicated square mark would fix it.
- `SectionWork` cycles four images across eight items. Six more would give each
  service its own.
