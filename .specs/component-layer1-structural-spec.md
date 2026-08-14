# Spec — Layer 1 Structural Components (`component-layer1-structural-spec`)

## Context
`component-catalog-spec.md` fixes **which** 34 components exist but explicitly doesn't specify any component's exact props/AST shape ("that's per-component work when each one is actually built"). This spec covers `CMP-L1` (`Worklist.md`) — the 5 Layer 1 / structural-base components: `Card`, `Container`, `Separator`, `Drawer`, `Modal`. Per `AGENTS.md` (`no_code_without_matching_spec`), this spec exists before the AST fixtures (`compiler/examples/{card,container,separator,drawer,modal}.ast.json`) that implement it.

Each component's AST shape follows `ast-component-spec.md` (`ComponentAst`/`ElementNode`/`ShowNode` in `compiler/src/types.ts`) and must pass `compiler/src/validate.ts` unchanged. Category conventions already fixed in `component-catalog-spec.md` (Structural: `Card`/`Container`/`Separator` — `:73-77`; Overlay: `Drawer`/`Modal` — `:66-71`) are referenced, not duplicated.

## Card
- **Tag**: `article` — a self-contained content unit, more semantic than `div`+`role`.
- **Props**: `title` (`string`, optional, `example: "Card title"`).
- **Shape**: optional `h3` heading (shown only when `title` is set, via `show`) + a content child. No event bindings — not interactive, no accessible-name requirement triggers.
- **Styling**: `var(--br-color-surface)` background, `var(--br-color-border)` border, `var(--br-radius-base)`, `var(--br-space-4)` padding.

## Container
- **Tag**: `div` — neutral layout wrapper (catalog: "everything else is pass-through").
- **Props**: `reverse` (`boolean`, optional, `example: false`) — flips arrangement order.
- **Shape**: `reverse` is consumed via a bound (`{ bind }`) `style` ternary (same pattern as `button.ast.json`'s `class` binding) — two literal, token-only style strings, picked at runtime. Children in the fixture are illustrative structural content, not a live nested-`Card` reference — the AST has no cross-component composition/import mechanism yet (real gap, tracked, not solved here; revisit once the compiler can resolve one component AST inside another).
- **Styling**: `display: flex` + `gap: var(--br-space-4)`, `flex-direction: column` / `column-reverse`.

## Separator
- **Tag**: `hr` — native separator semantics, no `role` needed.
- **Props**: `spacing` (`string` enum `sm`/`base`/`lg`, optional, `example: "base"`) — maps to `--br-space-2`/`--br-space-4`/`--br-space-8`.
- **Shape**: no children, no event. Not interactive — no accessible-name check applies.

## Drawer
- **Tag**: `div`, `role="dialog"` + `aria-modal="true"` on the panel.
- **Props**: `position` (`string` enum `top`/`right`/`bottom`/`left`, optional, `example: "right"`) — absorbs "Sheet" (`position: bottom`) per catalog.
- **Shape**: self-contained demo (same pattern as `counter.ast.json`) — a trigger `button` sets `state.open = true`; the panel is a `show` block (`focusOnShow: true`, `ast-component-spec.md` v1.2) containing a `Close` button that sets `state.open = false`. Panel carries `data-position: { bind: "props.position" }` so a consuming project's CSS can target `[data-position="..."]` for slide-in placement — the component itself only fixes the semantic position, not a specific animation.
- **Styling**: panel uses `position: fixed` + edge offsets (`top`/`right`/`bottom`/`left: 0`) picked by a `style` bind ternary on `props.position`, width/height as `%` (never fixed `px`, per `theme-spec.md` responsiveness rule), `var(--br-color-surface)`/`var(--br-color-border)`.

### Drawer — documented deviations / non-goals (v1)
- **Static/SEO output previously never rendered the open panel — found and fixed this round (ADR-013 → ADR-014, `CP-003`), no longer open.** `render-static.ts` resolves `show.bind` from a baked `state` value; before the fix that value was always `initial` (`false` for `Drawer`/`Modal`'s `open`), so the static/`qa-html`/Astro output for both contained **only the trigger button**. Fixed via `state[].staticValue` (`ast-component-spec.md` v1.3) — `Drawer`'s `state.open` now declares `"staticValue": true`, and `compile.ts` builds a separate static-target Mitosis component that bakes it. Confirmed by inspecting `compiler/out/Drawer/qa/Drawer.html` — the panel, close button, and content are now genuinely present. Re-running QA-001 against the now-visible panel caught a real, pre-existing contrast bug in the `Close` button (`--br-color-secondary` background + white text, `4.24:1` — below AA's `4.5:1` for small text, exactly the pairing `theme-spec.md` already warns against); fixed by switching to `--br-color-primary` (`6.57:1`).
- **No focus trap** — not modelable in AST v1 (no way to intercept `Tab` at the panel boundary). Tracked, same class of gap as `ast-component-spec.md`'s open `for`-focus item.
- **No document-level `Escape` dismiss** — AST v1 only binds events to elements, not `document`. Tracked.
- **No backdrop / click-outside dismiss** — catalog only mandates a backdrop for `Modal`, not `Drawer`; v1 closes only via the explicit `Close` button. Revisit if usage shows it's needed.
- **No real stacking mechanism for multiple simultaneous overlays** — catalog already flags this as "designed when a component is actually built"; this version uses a fixed literal `z-index` (no `--br-z-*` token exists yet), sufficient for a single open `Drawer`/`Modal` at a time, not for several stacked at once.

## Modal
- **Tag**: `div`, `role="dialog"` + `aria-modal="true"` on the panel, mandatory internal `header` (title + close button) and `footer` (action button) — catalog requirement.
- **Props**: `title` (`string`, optional, `example: "Modal title"`).
- **Shape**: same self-contained open/close demo pattern as `Drawer`. Panel uses `aria-labelledby` pointing at the header's `h2` id (real accessible name via a visible heading, not a duplicated `aria-label` string) — matches WCAG dialog-naming best practice. Backdrop is a `div` with an explicit `onClick` + `role="button"` + `aria-label="Close modal"` — required by `component-quality-spec.md` rule 1 (an event on a non-native-interactive tag needs an explicit `role`); a bare `div` with `onClick` and no `role` is exactly what the rule forbids.
- **Styling**: backdrop `position: fixed; inset: 0` + `var(--br-color-text)` at `opacity: 0.5`; panel `position: fixed`, centered (`top/left: 50%` + `transform: translate(-50%, -50%)`), `max-width`/`max-height` in `%` (never fixed `px`), internal scroll (`overflow: auto`) so it never exceeds the viewport — catalog requirement.

### Modal — documented deviations / non-goals (v1)
Same static/SEO-render fix as `Drawer` (above) — `state.open` also declares `"staticValue": true`; confirmed against `compiler/out/Modal/qa/Modal.html` that the backdrop, dialog, header, footer, and content are all genuinely present now. Same contrast bug existed on `Modal`'s header "×" close button (axe-core reported it as `incomplete` rather than a violation — a symbol-only glyph made the automated check inconclusive rather than a clean pass — but the underlying color pairing was identically wrong); fixed the same way, `--br-color-secondary` → `--br-color-primary`. Same three non-goals as `Drawer` (focus trap, document-level `Escape`, real multi-overlay stacking) — **except** backdrop: `Modal`'s backdrop **is** implemented (catalog-mandatory), unlike `Drawer`'s.

## Cross-cutting notes
- None of the 5 use `state` bound to visible text/attributes the way `Counter` does (only `state.open`, a boolean never displayed as text) — so the `aria-live` heuristic (`component-quality-spec.md` rule 3) never triggers for these fixtures. Not a gap; genuinely nothing here needs it.
- `border: 1px solid ...` (Card, Separator) and the panels' literal `z-index` are raw, non-tokenized values — no `--br-border-width-*` or `--br-z-*` token exists in `theme-spec.md` yet. Documented deviation from rule 5's spirit (not silently passed off as covered); `validate.ts`'s regex enforcement doesn't happen to catch either (border-width isn't in its width/height property list; z-index isn't checked at all) — tracked as a real gap for a future theme-token catalog extension, not a loophole to rely on elsewhere.

## Non-goals (this version)
- No real cross-component composition (`Container` referencing a live `Card` AST) — tracked above.
- No `--br-z-*` / `--br-border-width-*` tokens — tracked above.
- Focus trap, document-level `Escape`, multi-overlay stacking — tracked under Drawer/Modal above; see **ADR-013** (`.specs/ADRS.md`) for the decision to scope overlays to what AST v1 already supports rather than block this round on solving them.
