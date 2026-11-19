# Design system

## Direction

Gothic _aristocracy_, not Halloween: candlelight on obsidian, oxblood velvet, antique gilt. No
skulls, bats, drips or blackletter. Restraint is the luxury signal — large serif display type, a
lot of darkness, and light used as the one dramatic device.

## Palette (60 / 20 / 10 / 7 / 3)

| Token             | Hex       | Use                                         |
| ----------------- | --------- | ------------------------------------------- |
| Obsidian          | `#0B0B0D` | Ground, 60%                                 |
| Royal Oxblood     | `#57151F` | Haze, solid buttons, Vampiric accents, 20%  |
| Antique Gold      | `#B59660` | Kickers, rules, engraving, focus rings, 10% |
| Bone Ivory        | `#E5D8C5` | Text, 7%                                    |
| Midnight Charcoal | `#242126` | Panels, 3%                                  |

Defined once in `app/tokens.css` (`@theme`) and reused as Tailwind tokens. Contrast: ivory on
obsidian ≈ 14:1; secondary text `#A89D8E` ≈ 7:1.

## Type

Bodoni Moda (variable, high-contrast Didone — couture-house register) for display; Instrument Sans
for body and UI. Fluid `clamp()` sizes; small caps-style kickers with wide tracking. Self-hosted.

## Signature moments

1. **Candle hero** — a portal engraving that is only gilded where the candle falls. The pointer
   carries the light; on touch it wanders on a slow Lissajous path. One rAF loop writes two CSS
   variables (no React renders), pauses off-screen, and rests when reduced motion is on.
2. **Three Rites** — a pinned horizontal gallery on desktop (stacked on mobile), one panel per
   fragrance with its numeral, epigraph and an SVG flacon until real photography exists.
3. **Scroll-lit manifesto** — words ignite as they enter, like reading by candle.
4. **Sigil drawing** — the Seth sigil (sun disc + forked sceptre) draws itself through the mythology.
5. Corner-bracket frames, a film-grain overlay, oxblood haze that drifts at 26–34 s periods.

## Motion principles

Applied from Emil Kowalski's interface-motion craft (the requested "emil kowalski", "impeccable"
and "taste" skills were not installed in this environment, so their principles were applied by hand):

- Ease-out for entrances (`--ease-out-expo`), never linear; UI feedback ≤ 220 ms, cinematic reveals
  1.2–1.8 s only for the hero.
- Animate `transform`, `opacity`, `filter`, `clip-path` only; no layout properties.
- Buttons press to `scale(0.97)`; gold sweep on hover, not colour flashes.
- Interruptible: drawers use CSS transitions, not keyframes.
- `MotionConfig reducedMotion="user"` plus a global CSS kill switch; everything is readable with
  motion off.
- `LazyMotion` + `m` components keep the motion bundle small.

## Accessibility

Skip link, one `h1` per page, visible gold focus rings, `role="list"` on styled lists (Safari),
labelled forms with inline errors and `aria-invalid`, keyboard-reachable scroll regions, dialogs
for drawers, alt text from Shopify (illustrations are labelled as illustrations).
