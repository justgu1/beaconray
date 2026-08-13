# Spec — QA Automation: Playwright + axe-core (`qa-automation-spec`)

## Context
Implements `QA-001` (`Worklist.md`) — layer 1 of the 3-layer QA strategy (`component-qa-strategy-spec.md`). Turns the manual, static checks in `compiler/src/validate.ts` (structural — can a violation even be expressed in the AST) into a real, rendered-browser WCAG 2.1 AA audit (behavioral — does the actual DOM the compiler emits pass axe-core's rules). The two layers check different things and both stay in place; neither replaces the other.

## What gets tested
The compiler's **framework-agnostic static HTML output** (`render-static.ts`, `mitosis-compiler-spec.md` step 6), not the React/Vue-rendered output. See ADR-007 for why testing the raw markup instead of a bundled framework render, and ADR-009 for why that markup is now a real static render (via `componentToTemplate` + example prop values) instead of `componentToHtml`'s client-hydrated placeholders — genuinely baked text is also what makes this layer's a11y checks meaningful (axe-core inspects the actual rendered DOM either way, but real tags/text produce real findings, not placeholder noise). Doesn't catch framework-specific rendering bugs (a React-only regression, a Vue directive typo) — those are out of scope for this layer, tracked as a gap, not silently ignored.

## Pipeline

1. **`compile.ts`** gains a 5th target, `qa-html`: wraps the static render (`render-static.ts`) in a minimal standalone document (`<!doctype html>`, `<html lang="en">`, `<head><title>{name}</title></head>`, the baked component markup in `<body>`) — written to `compiler/out/<name>/qa/<name>.html`. The `lang` and `title` are required here specifically because axe-core flags their absence at the *document* level (`document-title`, `html-has-lang`) — noise unrelated to the component itself, confirmed by manual testing.
2. **`/qa` package** (`run.ts`): for every `compiler/out/*/qa/*.html`, launches headless Chromium via Playwright, opens the file (`file://`), runs `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()` (confirmed working API shape — requires `browser.newContext()` + `context.newPage()`, `browser.newPage()` directly throws). The `wcag22aa` tag pulls in axe-core 4.13's newer rules (e.g. `target-size`, SC 2.5.8) — see `component-quality-spec.md` for the full 24-criteria mapping and what's still out of the automated runner's reach.
3. **Reflow check (SC 1.4.10)**: resizes the viewport to 320×640 and asserts `document.documentElement.scrollWidth` doesn't exceed the viewport width (no forced horizontal scroll) — the one layout-level check that's cheap enough to automate today without a real CSS/theme system in place.
4. Collects violations (axe + reflow) per component, prints a summary (component name, violation id, impact, help text), writes a JSON report to `qa/out/<name>.report.json`.

## Pass/fail
- Zero violations across all components → exit 0.
- Any violation → exit 1, summary printed, JSON report written regardless (so a failure is always inspectable, not just a bare exit code).
- A component whose `qa-html` file is missing (compiler wasn't run first) is a hard error, not a skip.

## Non-goals (this version)
- No CI wiring yet — this is a script you run locally (`npm run qa` in `/qa`), matching the "documented, implemented when there are enough components to justify it" pacing from ADR-005.
- Doesn't test React/Vue rendering (see "What gets tested" above) — Layer 2 (Storybook, `QA-002`) is where interaction-level and framework-specific testing eventually lands.
- Doesn't check `aria-live`, `prefers-reduced-motion`, or focus management — axe-core's static ruleset doesn't cover those; they stay open items (same gap already documented in `mitosis-compiler-spec.md`).

## Future direction: URL-based auditing (tracked, not built)
The product direction is for this to eventually become a **platform feature**: users point the audit at any URL — a third-party site, component, or app, not just Beaconray-compiled output — and get SEO/GEO/WCAG feedback back through the platform. Today's `resolveTargets()` in `run.ts` only understands local `compiler/out/*/qa/*.html` paths; when this direction gets built, it needs a second resolution mode that takes a URL directly (`page.goto(url)` instead of `file://`), same axe/reflow checks, exposed as a hosted feature rather than a local script. Noted here and in `Roadmap.md`/`Worklist.md` so the local-only design isn't mistaken for the final shape.
