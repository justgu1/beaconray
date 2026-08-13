# Spec — Theme (`theme-spec`)

## Context
Implements `component-quality-spec.md` rule 5 ("theming via tokens"): no component may hardcode a CSS value that should be customizable. This spec defines the **Beaconray Theme** — the platform's default token catalog — and the mechanism components use to consume it. Mechanism is 100% CSS-framework-agnostic (`[[beaconray-css-agnostic]]` — plain CSS custom properties, no Tailwind/lib coupling in the core).

## Principle
Any CSS value that would otherwise be hardcoded — color, font, size, spacing, radius, shadow, duration, easing, breakpoint — becomes a `--br-*` custom property. The categories below are the Beaconray Theme's **initial** catalog, not a closed list — any new CSS concern a component needs gets a token the same way.

## Manifesto

The Beaconray Theme starts from one premise: design shouldn't be a barrier. The Royal Cyan palette (`#056583` to `#cde0e6`) went through real contrast verification before any usage decision — we don't rely on "looks fine" when a formula can confirm it. The Atkinson Hyperlegible typeface reinforces the same principle: every character is drawn to eliminate reading ambiguity, benefiting low-vision users and, as a direct side effect, making content more legible to search crawlers and AI agents — the same semantic foundation that serves a human serves a machine, the same logic behind the existing SEO/GEO gate. Accessibility here isn't a last-minute adjustment — it's the foundation.

## Token catalog

### 1. Color — palette "Royal Cyan"
Verified with the WCAG relative-luminance contrast formula (computed, not assumed) before assigning roles:

| Token | Value | Contrast (light mode) | Role |
|---|---|---|---|
| `--br-color-primary` | `#056583` | 6.57:1 vs white — passes as normal text AND as a button background with white text (symmetric ratio) | primary action, brand text |
| `--br-color-secondary` / `--br-color-border` | `#37849c` | 4.25:1 vs white — fails normal-text minimum (4.5:1), passes large-text/non-text (≥3:1) | borders, large text, icons — never small body text |
| `--br-color-surface` | `#ffffff` | — | default page/component background |
| `--br-color-surface-accent` | `#cde0e6` | 1.36:1 vs white (decorative only) | card/highlight background |
| `--br-color-text` | `#056583` | 6.57:1 vs white, 4.82:1 vs `--br-color-surface-accent` | body text |
| `--br-color-on-primary` | `#ffffff` | 6.57:1 vs `--br-color-primary` | text placed on top of a `--br-color-primary` background (e.g. button label) — verified separately from plain body text since it's the inverse pairing |
| `--br-color-focus-ring` | `#056583` | 6.57:1 vs white — comfortably clears the 3:1 WCAG minimum for a focus indicator | `:focus-visible` outline |
| `--br-color-success` | `#166534` | 7.13:1 vs white text | success state (not part of the Royal Cyan ramp — separate, verified) |
| `--br-color-danger` | `#b91c1c` | 6.47:1 vs white text | error state (same note) |

**Known risk, documented**: adjacent Royal Cyan steps have very low mutual contrast (~1.4–1.5:1) — never pair two neighboring steps as a border/surface combo (fails the 3:1 non-text minimum). Always skip at least 2 steps (e.g. `#056583` on `#cde0e6` → 4.82:1, fine).

Dark mode (`@media (prefers-color-scheme: dark)`, same token names redefined) — `#056583` alone is too weak against a near-black surface (3.01:1), so dark mode promotes a lighter step:

| Token | Dark value | Contrast vs `#0a0a0a` |
|---|---|---|
| `--br-color-surface` | `#0a0a0a` | — |
| `--br-color-text` | `#cde0e6` | 14.52:1 |
| `--br-color-primary` | `#69a3b5` | 7.08:1 |
| `--br-color-secondary` | `#9bc1cd` | 10.28:1 |
| `--br-color-on-primary` | `#0a0a0a` | 7.08:1 vs `#69a3b5` |
| `--br-color-focus-ring` | `#69a3b5` | 7.08:1 |

**Verified, not assumed**: white text on the dark-mode primary (`#69a3b5`) only reaches 2.80:1 — fails outright. `--br-color-on-primary` has to flip to near-black in dark mode instead (`#0a0a0a`, 7.08:1) — the "text on primary" pairing isn't just "invert the surface," it needed its own contrast check.

### 2. Typography — Atkinson Hyperlegible
Chosen after explicitly rejecting Inter ("too generic"). Designed by the Braille Institute specifically to maximize distinction between similar-looking characters (`I`/`l`/`1`, `O`/`0`) — reduces cognitive load, helps screen readers and crawlers/LLMs read text unambiguously.

- `--br-font-family-base: 'Atkinson Hyperlegible', system-ui, sans-serif` (native fallback — works with zero webfont load, the webfont is an enhancement, not a dependency).
- `--br-font-size-{xs,sm,base,lg,xl}`
- `--br-font-weight-{normal,medium,bold}`
- `--br-line-height-base`

### 3. Spacing & sizing
- `--br-space-{1,2,3,4,6,8}` (4px-based scale)
- `--br-radius-{sm,base,lg,full}`

### 4. Animation
- `--br-duration-{fast,base,slow}`: `150ms` / `250ms` / `400ms` — the commonly-cited 100–300ms "sweet spot" for micro-interactions/entrance transitions falls inside fast/base; slow covers larger transitions outside that window, used deliberately, not by default.
- `--br-ease-{standard,decelerate,accelerate,linear}` (`cubic-bezier(...)` values).
- `prefers-reduced-motion` override, global, in the same theme file: zeroes animation/transition duration automatically.

### 5. Focus visibility (closes WCAG 2.4.7 — previously tracked, not implemented)
```css
:focus-visible {
  outline: 2px solid var(--br-color-focus-ring);
  outline-offset: 2px;
}
```
Global rule in the theme file, applies to every focusable element automatically — no per-component work needed. `--br-color-focus-ring` clears the WCAG minimum (3:1) with comfortable margin in both light and dark mode (see table above).

### 6. Responsiveness — mandatory, not opt-in
Every Beaconray component is mobile-first by default:
- No fixed `px` width/height in a component's `style` — relative units only (`%`, `rem`, `fr`, `var(--br-space-*)`).
- `overflow-wrap: break-word` as the default on any text-bearing node, so a long string/URL never breaks a narrow container.
- Minimum touch target 24×24px (SC 2.5.8 — already enforced, `component-quality-spec.md` rule 2) reinforced here as a responsiveness concern, not just isolated a11y.
- Reflow at 320px (SC 1.4.10) is already tested in QA-001 (`qa/src/run.ts`) — this principle is the reason that check exists, not a coincidence.

## Consumption mechanism — 100% agnostic
A component references a token via `var(--br-*)` inside the native `style` attribute (`attributes` in the AST is already `Record<string, AttributeValue>` — `style` is just another key, zero schema change). Works identically with Tailwind, plain CSS, styled-components, or anything else layered on top. Customization = override the variable in `:root` (or a narrower scope) in the consuming project — the component itself never changes.

## Static enforcement (`validate.ts`)
Same severity as the other quality-gate rules — a violation aborts compilation:
- Raw color (`#hex`, `rgb()`, `rgba()`) outside `var(...)` in `style` → rejected.
- Raw time (`\d+(\.\d+)?m?s`) outside `var(...)` in `style` → rejected.
- Fixed pixel width/height (`width:\s*\d+px`, `height:\s*\d+px`) in `style` → rejected (responsiveness rule).
- **Not enforced this round**: arbitrary font-size/spacing in px/rem/em outside a token — a reliable regex would need a real CSS parser to avoid false positives (e.g. `border-width: 1px` is legitimate); documented gap, not pretended as covered.
- **Not reached**: `style` built from `{ bind: expr }` (dynamic runtime string) — still depends on the manual checklist (`component-quality-checklist.md`).

## Future: shareable themes
A "theme" in this architecture is just a values file — an override set for the same `--br-*` names. Swapping a theme never touches component code, which is what makes a theme cleanly publishable/shareable later (`[[beaconray-theme-marketplace]]`, tracked as `PLAT-001` — not built yet). The CSS-agnostic mechanism matters doubly here: a published theme has to work regardless of what CSS approach the installing project uses.

## Non-goals (this version)
- No build step, no preprocessor — plain CSS only.
- Doesn't cover every CSS property yet (shadows, breakpoints as explicit tokens, etc.) — the mechanism is generic, the initial catalog is not exhaustive; extend the same way when a component needs a concern not yet tokenized.
- Full brand palette (more shades, secondary brand colors) deferred to the Studio's visual theme editor (Fase 2).
