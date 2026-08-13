# Spec — Component Quality Gate (`component-quality-spec`)

## Context
Mandatory quality bar for every component that comes out of the compiler (`.specs/mitosis-compiler-spec.md`), regardless of which framework target it's rendered to. Not optional, not framework-specific.

## Rules

### 1. Semantic HTML5
- The tag used must match the element's real role (`button` for actions, `a` for navigation, `nav`/`header`/`main`/`section` for structure).
- Never `div`/`span` carrying a click/interaction event without an explicit `role` attribute.
- **AST-level rule**: any node with an event binding (`on*`) must use a native interactive tag (`button`, `a`, `input`, `select`, `textarea`) OR declare an explicit `role`.

### 2. WCAG 2.2 AA
- Every interactive element (`button`, `a`, `input`, `select`, `textarea`) needs an accessible name: visible text in `children`, or `aria-label`, or `aria-labelledby`.
- `img` always has `alt` (empty string allowed only when purely decorative).
- Never a positive `tabindex`.
- Every form field has an associated label (`aria-label`/`aria-labelledby`, or an associated `<label>` — exact mechanism to be defined once the AST supports form fields).

**Target bumped from 2.1 to 2.2 AA** — 2.2 is a strict superset (adds 4 new AA criteria, doesn't remove any). The full list of 24 AA-exclusive success criteria (2.1 + 2.2) doesn't all apply at the same layer, though — a single compiled component genuinely cannot satisfy a site-wide or content-level requirement. Mapped below so nothing gets silently dropped, but also nothing gets falsely claimed as "covered":

| SC | Requirement | Applies to | Enforcement | Status |
|---|---|---|---|---|
| 1.2.4 | Captions (Live) | media component (player) | N/A — no media component modeled yet | Out of scope today, revisit when one exists |
| 1.2.5 | Audio Description (Prerecorded) | media component | N/A — same as above | Out of scope today |
| 1.3.4 | Orientation | app/page | can't be fixed by one isolated component | Out of scope for the compiler (Studio/global CSS) |
| 1.3.5 | Identify Input Purpose | component (`input`) | needs a "purpose" taxonomy the AST doesn't model yet (`autocomplete`) | Tracked — add when form-field semantics land |
| 1.4.3 | Contrast (Minimum) | component, real CSS | axe-core's `color-contrast` rule checks computed style automatically | Runs today via QA-001; only bites once real colors exist (Tailwind classes aren't resolved yet) |
| 1.4.4 | Resize Text 200% | CSS/layout | needs real zoom, not static AST analysis | Tracked — Layer 2/3 once real CSS exists |
| 1.4.5 | Images of Text | content decision | not code-checkable | Out of scope — documented guideline, not enforced |
| 1.4.10 | Reflow | layout (320px/400% zoom) | Playwright: resize viewport to 320px, assert no horizontal scroll | **Implemented this round** (QA-001 runner) |
| 1.4.11 | Non-text Contrast | component, real CSS | axe-core's contrast rules cover this once real colors exist | Same status as 1.4.3 |
| 1.4.12 | Text Spacing | CSS | needs injecting override CSS + checking for clipping | Tracked — not implemented, high effort for current payoff |
| 1.4.13 | Content on Hover or Focus | interaction (tooltip/popover) | needs a real tooltip component to test against | Tracked — no such component yet |
| 2.4.5 | Multiple Ways | site navigation | app-level, not component-level | Out of scope for the compiler |
| 2.4.6 | Headings and Labels | component | our accessible-name rule guarantees non-empty; *meaningful* text isn't code-checkable | Partial — non-empty enforced, quality of wording isn't |
| 2.4.7 | Focus Visible | component CSS (`outline`) | global `:focus-visible` rule in `theme-spec.md`'s token file, using a verified-contrast `--br-color-focus-ring` token | **Implemented this round** |
| 2.4.11 | Focus Not Obscured (Minimum) | layout with overlays (modal/dropdown) | needs a real overlay component to test against | Tracked — no such component yet |
| 2.5.7 | Dragging Movements | drag-based component | only applies once a drag component exists | N/A today, add the AST rule when one is built |
| 2.5.8 | Target Size (Minimum) | component, real rendered size | axe-core 4.13's `target-size` rule (tag `wcag22aa`) | **Included this round** in the QA runner; only bites with real size CSS |
| 3.1.2 | Language of Parts | component (mixed-language text) | AST doesn't model per-node language yet | Tracked |
| 3.2.3 | Consistent Navigation | site navigation | app-level | Out of scope for the compiler |
| 3.2.4 | Consistent Identification | whole design system | a single component's AST can't enforce cross-component consistency | Out of scope for the compiler (Studio's job) |
| 3.3.3 | Error Suggestion | form validation | AST doesn't model form validation yet | Tracked |
| 3.3.4 | Error Prevention (Legal, Financial) | multi-step app flow | app-level | Out of scope for the compiler |
| 3.4.1 | Accessible Authentication | login flow | app/backend-level (Symfony) | Out of scope for the compiler |

"Tracked" = real gap, revisit when the relevant AST feature (forms, style tokens, media, overlays) gets built — not dropped, not faked as done. "Out of scope for the compiler" = structurally belongs to the Studio/app/backend layer, never something a single component's AST could satisfy on its own.

### 3. Mandatory multi-modal access (keyboard, voice, other interactions)
- Nothing may depend on mouse/touch alone. Rule 1 already forces native interactive tags, which are keyboard-operable by default — this makes it an explicit requirement, not an accident.
- The accessible name/role from rule 2 is also what lets voice-control software (Voice Access, Dragon) and screen readers target and announce the element correctly — same rule, two reasons it matters.
- Dynamic content (depends on AST v1 — state) needs an `aria-live` region when the change isn't the direct result of the user's own action on that element.
- Animation must respect `prefers-reduced-motion` (see rule 5) — not optional.
- Focus management inside conditionals/loops (`Show`/`For`) is an open item, tracked for when the AST gains those features (next round).

### 4. Performance / ultra-lightweight
- Budget: compiled output (per framework) ≤ 2KB gzip for a simple, stateless component — adjustable per component as real complexity grows, but always documented, never left vague.
- Zero runtime dependency beyond the target framework itself — no extra library pulled in by a component.
- No unnecessary wrapper element — already confirmed the current compiler doesn't leak Mitosis's internal text-node convention (`name: 'div'` placeholder) into the generated output.

### 5. Theming via tokens (generic — color, typography, spacing, animation, and any future CSS concern)
- A component never hardcodes a CSS value that should be customizable — color, font, size, spacing, radius, duration, easing, or anything else CSS-related. The categories listed are the Beaconray Theme's initial catalog, not a closed list.
- It references a central token instead (e.g. `--br-color-primary`, `--br-duration-fast`), via plain CSS custom properties — no CSS framework/lib dependency in the core (`[[beaconray-css-agnostic]]`).
- Full token catalog — Beaconray Theme (Royal Cyan palette, Atkinson Hyperlegible typeface, spacing/sizing, animation, focus-visibility) — defined in `.specs/theme-spec.md`. **Implemented this round.**
- Static enforcement in `validate.ts`: raw color, raw time value, and fixed-pixel width/height in a `style` attribute are all rejected. Font-size/spacing enforcement is not implemented (documented gap — needs a real CSS parser to avoid false positives, not a regex).

### 6. SEO & GEO (Search + Generative Engine Optimization)
SEO (search crawlers) and GEO (LLM/AI-answer-engine crawlers — Perplexity, ChatGPT browsing, Google AI Overviews) share the same root requirement: **real content has to be present in the markup itself**, not injected by client-side JavaScript after load. Most search crawlers and effectively all LLM crawlers don't execute JS — a component whose text only appears via a `<script>` hydration step is invisible to both.

- **Genuinely static markup, not JS-hydrated placeholders**: the compiler's static-output targets (Astro, QA-001's `qa-html`) render through `componentToTemplate` with real `example` prop values (`ast-component-spec.md`, prop `example` field) baked in at compile time — confirmed via manual testing that this produces actual `<h2>Items</h2>`-style markup with real text, not a `data-el` placeholder filled by JS. See `mitosis-compiler-spec.md` for the render mechanism. **Implemented this round.**
- **Links must be real links**: every `<a>` node needs an `href` attribute — a link with no `href` doesn't exist to any crawler, only to a JS click handler. **AST-level rule, implemented this round** in `validate.ts`.
- **Semantic HTML5 and accessible names (rules 1–2 above) double as SEO/GEO signals** — the same structure that makes a component usable by assistive tech is what search/LLM crawlers parse to understand it. No separate rule needed; this is the same requirement serving two purposes.
- **Structured data (schema.org JSON-LD)**: tracked as a v2 AST feature (optional `schema` field on `ComponentAst`, emitted as a `<script type="application/ld+json">` block in the static output) — documented now, not implemented this round.
- **Heading hierarchy** (a component doesn't know what level it's nested at on a real page) and **`llms.txt`-style site-level signals** are page/app-level concerns, out of scope for a single compiled component — same reasoning as the WCAG site-level rows above.

### 7. Note on interactivity trade-off
The static-rendered output (Astro, `qa-html`) has **no client-side interactivity** by design — a `Counter`'s button renders with its initial state baked in, but clicking it does nothing in that output, because there's no hydration script attached. This is intentional for a genuinely static, crawlable render; real interactivity for Astro would come from Astro's own island/hydration directives wrapping a React/Vue output later, not from Mitosis's own client-hydration script. Not a silent gap — the React/Vue targets remain the fully-interactive ones.

### 8. Responsiveness — mandatory, not opt-in
Every component is mobile-first by default:
- No fixed `px` width/height in a component's `style` — relative units only. **Enforced in code** — `validate.ts` rejects a fixed-pixel `width`/`height` in `style`.
- Default `overflow-wrap: break-word` on text-bearing nodes, so a long string/URL never breaks a narrow container.
- 24×24px minimum touch target (SC 2.5.8, rule 2) reinforced here as a responsiveness concern too, not only isolated a11y.
- Reflow at 320px (SC 1.4.10) is exactly what QA-001's reflow check (`qa/src/run.ts`) verifies — that check exists because of this rule, not by coincidence.

## Non-goals (this version)
- No automated enforcement yet for most rules — see `.specs/component-qa-strategy-spec.md` and `.specs/skills/component-quality-checklist.md` for how this gets checked, today manually via the checklist (rules 1–2's AST-level subset and the SEO `href`/static-render rules are the exception — enforced in code, see `mitosis-compiler-spec.md`/`validate.ts`).
- Structured data (schema.org) not implemented yet — tracked in rule 6.
- No URL-based auditing yet — today's QA tooling only audits the compiler's own output. The platform's eventual direction is to let users point at **any** site/component/app URL (not just Beaconray-compiled output) and get SEO/GEO/WCAG feedback as a hosted platform feature — noted here and in `Roadmap.md`/`Worklist.md` as a tracked future direction, not built this round.
