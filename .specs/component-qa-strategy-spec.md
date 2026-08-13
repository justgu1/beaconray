# Spec — Component QA Strategy (`component-qa-strategy-spec`)

## Context
How `.specs/component-quality-spec.md`'s requirements actually get verified. Documented now as a 3-layer contract; each layer's implementation is its own Worklist item (`QA-001`, `QA-002`, `QA-003`) and lands in a later round, not this one.

## The 3 layers

### Layer 1 — Playwright + axe-core (`QA-001`)
Automated baseline, equivalent to the original `Worklist.md` QA-001 task. Renders the compiled output headless, runs `@axe-core/playwright` against it, produces an objective WCAG 2.1 AA violation report (contrast, ARIA, structure). Cheapest layer to run, catches mechanical violations — doesn't tell you whether the component actually feels usable.

### Layer 2 — Storybook (`QA-002`)
The real playground: one story per prop/state variant of a component. Accessibility addon (axe-core again, but at dev time, immediate feedback while building). Interaction addon (`@storybook/test`) drives a Play function that dispatches real keyboard/pointer events, not just static assertions — this is where a component gets exercised in isolation before it's wired into any real flow.

### Layer 3 — Cypress (`QA-003`)
Real end-to-end interaction in a real browser. Closes the gap plain Playwright scripts don't cover: actual user journeys through the compiled component, not just headless DOM snapshots. Most expensive layer to maintain — adopt last, once there's a real user flow worth testing, not for every single component in isolation.

## Adoption order
Playwright + axe-core → Storybook → Cypress. Cheapest/most mechanical first, most expensive/most realistic last. Don't skip ahead — a component doesn't need Cypress coverage before it has passed Layer 1.

## Non-goals (this version)
No CI wiring, no automated triggers yet — this spec exists so implementation (when it happens) has a fixed contract to build against, not to be re-litigated per component.
