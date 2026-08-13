# Architecture Decision Records

## ADR-001 — Adopt spec-driven harness
**Status:** Accepted
**Context:** Project had no code yet, only planning docs (`Roadmap.md`, `Worklist.md`, `README.md`). Old generic `.specs/` scaffold was removed. Needed a discipline so any agent/dev touching the repo works from specs, not ad-hoc.
**Decision:** `AGENTS.md` (short, YAML, no prose) mandates loading `.specs/SPECS.md`, `.specs/SKILLS.md`, `.specs/ADRS.md` before any task, and requires `CHANGELOG.md` update every session. Specs live one file per feature/module at `.specs/{feature}-{module}-spec.md`. Skills indexed in `.specs/SKILLS.md`, files under `.specs/skills/`.
**Consequences:** No code change happens without a matching spec entry. Slightly more overhead per task, but traceable decisions and no drift between docs and code.

## ADR-002 — Build order: Mitosis/components first, backend later
**Status:** Accepted
**Context:** `Worklist.md` originally sequenced work Backend-first (BK-001 Postgres schema before anything else). All later tasks (CLI, Studio, Compiler, QA) depend on that schema existing.
**Decision:** Invert the order. Start with the Mitosis compiler and component AST pipeline; build the rest of the system (backend, CLI, Studio) around the components produced this way.
**Consequences:** Backend/DB work is deferred — `Worklist.md` dependency chain (BK-* → CLI-* / ST-* → CP-* → QA-*) no longer reflects actual execution order and needs revisiting once backend work starts.

## ADR-003 — Backend framework: Symfony, not Laravel
**Status:** Accepted (deferred effective date)
**Context:** `Roadmap.md`, `Worklist.md`, and `README.md` all describe a Laravel + Postgres + Redis + MinIO stack.
**Decision:** Backend API will be built with Symfony instead, once backend work starts (see ADR-002 — not immediate).
**Consequences:** `Roadmap.md`, `Worklist.md`, `README.md` still say Laravel and are stale on this point; must be corrected when the backend project actually starts, not before.

## ADR-004 — Pilot component AST authored by hand
**Status:** Accepted
**Context:** Studio (ST-001/ST-002) doesn't exist yet, so there's no visual builder to produce a component AST.
**Decision:** The pilot component's AST is a hand-written JSON file following `.specs/ast-component-spec.md`. The Mitosis compiler pipeline consumes this JSON the same way it will later consume Studio-generated ASTs. Which component becomes the pilot (Button, etc.) is decided at implementation time, not fixed now.
**Consequences:** AST spec must be generic enough to support both hand-authored JSON now and Studio output later — no Studio-specific shortcuts in the format.

## ADR-005 — Mandatory component quality gate + 3-layer QA strategy
**Status:** Accepted
**Context:** Nothing enforced semantic HTML5, accessibility, performance, or animation discipline on components coming out of the compiler. Without a written gate, quality depends on whoever happens to be building a component that day.
**Decision:** Every component must satisfy `.specs/component-quality-spec.md` (semantic HTML5, WCAG 2.1 AA, mandatory multi-modal access — keyboard/voice/screen-reader, a documented performance budget, animation via theme tokens only). Verification follows a 3-layer strategy documented in `.specs/component-qa-strategy-spec.md`: Playwright+axe-core (automated baseline, `Worklist.md` QA-001) → Storybook (playground + a11y/interaction addons, QA-002) → Cypress (real browser UI/UX flows, QA-003). Only the contracts are written this round — enforcement today is manual, via `.specs/skills/component-quality-checklist.md`; automation lands when there are enough real components to justify it.
**Consequences:** Every future component has a fixed bar to check against instead of an ad-hoc one. The 3 QA layers aren't implemented yet — `Worklist.md` tracks that as separate, still-pending tasks (QA-001/002/003).
