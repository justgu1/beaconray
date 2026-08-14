# Spec — Component Catalog (`component-catalog-spec`)

## Context
Beaconray's goal is to let someone build an entire site/app/system/desktop app using only Beaconray components. Before building any new component, this spec fixes **which** components exist in v1 and **why**, so nobody re-derives a different catalog later without checking here first.

## Selection criterion
A candidate was screened against one question, applied consistently across all 47 candidates originally proposed: **does it have real behavior/opinion beyond what a developer would write themselves in two minutes?** If not, it's not a component — it's a styling convention the theme (`theme-spec.md`) already covers, or a composition the consuming project should just write. This is why `Section`, `Panel`, `AppShell`, standalone `Grid`, and standalone `Checkbox`/`Radio`/`Range` all got cut — none of them do anything a themed native element or a `Container`/layout primitive doesn't already do.

## Catalog v1 — 34 components

### Layer 1 — Structural base (5)
- **Card** — a content unit with its own visual identity; `Container` arranges `Card`s inside it.
- **Container** — absorbs what would've been a standalone `Grid` (built-in grid system), auto-arranges `Card`s responsively, options like `reverse`.
- **Separator** — deliberately simpler than a generic "Divider": just a configurable line (color/thickness/margin via theme tokens).
- **Drawer** — a signature Beaconray component. A `position` prop (`top`/`right`/`bottom`/`left`) covers what would've been a separate "Sheet" (`position: bottom`) — no separate component needed.
- **Modal** — mandatory internal header **and** footer, never exceeds the viewport (scrolls internally for long content), mandatory backdrop, must handle stacking multiple modals (z-index).

### Layer 2 — Interactive (18)
- **Link** — foundation; everything else depends on it.
- **Button** — already has a working pilot (`compiler/examples/button.ast.json`).
- **Input** — **floating-label pattern**: the label starts inside the field like a placeholder, floats up on focus/fill; only then does a real placeholder (if any) appear below it. Solves WCAG (label is always present, never just a placeholder that vanishes) and GEO at the same time.
- **Switcher** — unifies Checkbox/Radio/Switch/Toggle into one component: `multiple: false` behaves like a radio/toggle, `multiple: true` behaves like a checkbox group.
- **Dropdown** — unifies Select/Combobox, a signature component: optional search, async paginated infinite scroll (loads visible+selected, unloads what's scrolled out of view — stays light even with large datasets), option shape `{label, value, icon?}`, single or multiple selection.
- **Date Picker** — no good reference implementation exists anywhere on the web — open design, iterate once there's something to react to.
- **Accordion** — `show`/`focusOnShow` (`ast-component-spec.md` v1.2) already exist for exactly this.
- **Popover** — more generic than Modal: content + optional dismiss (X) + optional auto-dismiss timer bar, no mandatory header/footer, commonly used for success/failure feedback (often top-right, not always).
- **Toast** — Popover + a built-in timer (a variant, not built from scratch).
- **Tooltip** — accessibility-critical behavior: if focus moves to another tooltip-bearing element within roughly 1 second, don't close-then-reopen — swap the content in place to avoid flicker.
- **Breadcrumb** — separator + `aria-current` on the current step.
- **Paginator** — deliberately simple to use.
- **Avatar** — falls back to initials when the image fails to load.
- **Badge** — overlay positioning relative to a parent element.
- **Progress bar** — `role="progressbar"`.
- **Spinner** — indeterminate loading state.
- **File Upload / Dropzone** — drag events + file validation.
- **Color Picker**.

### Layer 3 — Complex, built on top of the base layers (11)
- **Text/Content Editor** — replaces a plain Textarea: rich text (font, size, color, image, code) — like Teams' expandable text box.
- **Carousel** — WCAG SC 2.2.2 requires a pause control if autoplay exceeds 5 seconds.
- **DataTable** — sort/filter/pagination.
- **Stepper/Wizard** — guided multi-step flow.
- **Chart** — a whole chart-library initiative is planned around this, following the same project conventions — bigger than "one component," tracked as its own future direction.
- **Navbar** — absorbs what would've been a separate "Sidebar" (same thing, an orientation prop: horizontal/vertical).
- **Resizable** — drag-to-resize utility for a panel/box.
- **Tabs** — promoted from "doesn't make sense alone" to a composite: header nav-links + content panels linked to each.
- **Tree View** — expandable hierarchical list (folders, nested comments, org charts).
- **Command Palette** — keyboard-triggered (Cmd/Ctrl+K) overlay, a search field that filters actions/pages (Slack/VS Code/Linear/Notion style).
- **Calendar** — a standalone month/week view managing events over a range — considerably more than Date Picker's field+popup, kept alongside it, not instead of it.

### Cut for good
Section, standalone Grid, Sheet, AppShell/Layout, "Popup" as a separate term (folded into Popover), Textarea as a simple component, standalone Checkbox/Radio/Switch, standalone Select/Combobox, standalone Slider/Range (just a themed native `<input type="range">`), Menu (redundant with Dropdown/Popover/Modal), Alert/Banner, Panel, Timeline.

### Deferred, not cut
Kanban (drag & drop) — the interaction model isn't settled yet, revisit once it is.

## Pattern conventions by category
Every component in a category follows the same AST-level conventions — these reference specs that already exist (`ast-component-spec.md`, `component-quality-spec.md`, `theme-spec.md`), not new rules invented here.

### Form control
`Input`, `Switcher`, `Dropdown`, `Date Picker`, `Color Picker`.
- Consistent label/error/disabled/required convention — every form control has a real accessible name (`component-quality-spec.md` rule 2), not just a placeholder.
- `Input`'s floating-label behavior is the reference pattern — other form controls adopt the same "label never disappears" principle where it applies.
- Styling exclusively via `--br-*` tokens (`theme-spec.md`) — no hardcoded color/spacing/duration in any form control's `style`.

### Overlay
`Modal`, `Drawer`, `Popover`, `Toast`, `Tooltip`, `Command Palette`.
- Focus management via `show.focusOnShow` (`ast-component-spec.md` v1.2) — already verified working (`useEffect(..., [deps])` in React, `computed`+`watch` in Vue).
- Consistent dismiss convention: `Escape` key, click-outside, and an explicit close control (X) where applicable.
- `role="dialog"`/`aria-modal` (or the equivalent for non-modal overlays like `Popover`/`Tooltip`) per WCAG.
- Stacking: multiple overlays open at once need a defined z-index/stacking order — concrete mechanism to be designed when `Modal` is actually built (this spec only states the requirement).

### Structural
`Card`, `Container`, `Separator`.
- Content slot convention: the AST's generic `children` already covers this — no special "slot" node needed.
- `Container`'s grid/arrangement logic and `Card`'s visual identity are the only opinionated parts; everything else is pass-through.

### Navigation
`Link`, `Breadcrumb`, `Paginator`, `Tabs`, `Navbar`.
- `aria-current` on the active/current item (breadcrumb step, active tab, current nav link).
- Active-state styling via theme tokens (`--br-color-primary` or similar), never hardcoded.

## Architecture note: base vs. complex is architectural, not commercial
Layer 3 (complex) components are meant to be built **on top of** Layer 1/2 (base) components — reusing their AST/API, not duplicating logic. This split is purely architectural.

**It is explicitly not the monetization boundary.** The actual monetization model is usage-based, per project: the trial gives one free project, charging kicks in only if the user wants to use Beaconray components across more than one project — independent of which layer a component belongs to. An earlier draft of this spec conflated the two; corrected after reconsideration. See `Roadmap.md`/`Worklist.md` for where the monetization mechanism itself gets built (Fase 3/4, backend-dependent) — not part of this spec.

## Non-goals (this version)
- No component is actually built in this round — this spec is catalog + convention only.
- Doesn't yet specify each component's exact props/AST shape — that's per-component work when each one is actually built.
- Kanban's interaction model is explicitly not designed here.
