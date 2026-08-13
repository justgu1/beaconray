# Spec — Component Quality Gate (`component-quality-spec`)

## Context
Mandatory quality bar for every component that comes out of the compiler (`.specs/mitosis-compiler-spec.md`), regardless of which framework target it's rendered to. Not optional, not framework-specific.

## Rules

### 1. Semantic HTML5
- The tag used must match the element's real role (`button` for actions, `a` for navigation, `nav`/`header`/`main`/`section` for structure).
- Never `div`/`span` carrying a click/interaction event without an explicit `role` attribute.
- **AST-level rule**: any node with an event binding (`on*`) must use a native interactive tag (`button`, `a`, `input`, `select`, `textarea`) OR declare an explicit `role`.

### 2. WCAG 2.1 AA
- Every interactive element (`button`, `a`, `input`, `select`, `textarea`) needs an accessible name: visible text in `children`, or `aria-label`, or `aria-labelledby`.
- `img` always has `alt` (empty string allowed only when purely decorative).
- Never a positive `tabindex`.
- Every form field has an associated label (`aria-label`/`aria-labelledby`, or an associated `<label>` — exact mechanism to be defined once the AST supports form fields).

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

### 5. Animation via tokens
- A component never hardcodes a duration or easing value.
- It references a central token instead (e.g. `--duration-fast`, `--easing-standard`), the same way Tailwind's `@theme` centralizes design tokens.
- Full token system design is tracked as a TODO in `.specs/animation-theme-spec.md` (not written yet, next round) — only the "no magic value" rule is in force today.

## Non-goals (this version)
- No automated enforcement yet — see `.specs/component-qa-strategy-spec.md` and `.specs/skills/component-quality-checklist.md` for how this gets checked, today manually via the checklist.
