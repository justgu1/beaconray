# Spec — Component AST (`ast-component-spec`)

## Context
Format of the AST describing a visual component, framework-agnostic. Consumed by the compiler (`mitosis-compiler-spec.md`) to generate `.lite.tsx` (Mitosis) and then React/Vue/Astro. Today it's hand-authored JSON (Studio doesn't exist yet — ADR-004); later the Studio produces the same format.

**v1** (ADR-006): adds `state`, events, conditional (`show`) and loop (`for`) — v0 only covered props → attributes/text, static. Every valid v0 AST stays valid under v1 (additive extension, no breaking change).

**v1.2** (ADR-011): adds `show.focusOnShow` (move focus to the conditional block when it appears) and a top-level `schema` field (structured data). Both additive.

**v1.3** (ADR-014): adds `state[].staticValue`, optional. The static/SEO render (`mitosis-compiler-spec.md` step 6) has no runtime — it bakes `state` from a literal value at generation time. Before v1.3 that value was always `initial`, so any component gating real content behind `state` (found building `Drawer`/`Modal`, `CMP-L1`) rendered that content invisible to crawlers/`axe-core` in the static output, regardless of what the interactive React/Vue targets correctly did with a real `initial`. `staticValue`, when present, is what the static targets bake instead; `initial` still governs React/Vue. Additive — absent `staticValue` falls back to `initial`, identical to pre-v1.3 behavior.

## Format

```json
{
  "name": "Counter",
  "props": [
    { "name": "items", "type": "string", "required": false }
  ],
  "state": [
    { "name": "count", "type": "number", "initial": 0 }
  ],
  "root": {
    "tag": "div",
    "children": [
      {
        "show": { "bind": "props.items && props.items.length > 0" },
        "children": [
          { "tag": "h2", "children": [{ "text": "Items" }] }
        ]
      },
      {
        "tag": "button",
        "attributes": {
          "aria-label": "Increment",
          "onClick": { "on": "state.count = state.count + 1" }
        },
        "children": [
          { "text": { "bind": "state.count" } }
        ]
      },
      {
        "tag": "ul",
        "children": [
          {
            "for": { "each": "props.items", "as": "item" },
            "children": [
              { "tag": "li", "children": [{ "text": { "bind": "item" } }] }
            ]
          }
        ]
      }
    ]
  }
}
```

## Rules

- `name`: PascalCase, component name.
- `props`: list of `{ name, type, required, enum?, example? }`. `type` is `string | boolean | number`. `example` (v1.1) is a realistic literal value matching `type`, used to pre-render genuinely static markup (real text, not a placeholder) for the SEO/GEO-focused compiler outputs — see `mitosis-compiler-spec.md`. Absent `example` falls back to an empty/zero/false value for that type, which produces technically-valid but content-empty static output — fine for a pipeline smoke test, not for a real component meant to be crawled.
- `state?`: list of `{ name, type, initial, staticValue? }` — local component state. `initial` is a literal (`string | boolean | number`) matching the declared type, used by the interactive (React/Vue) targets. `staticValue?` (v1.3): the literal to bake into the static/SEO targets (Astro, `qa-html`) instead of `initial` — use when `initial` gates content that should still be crawlable/auditable (e.g. an overlay's `open`, `initial: false` at runtime but `staticValue: true` so the panel actually renders for SEO/GEO and QA-001). Absent = falls back to `initial`. Absent `state` entirely = stateless component (v0).
- `schema?` (v1.2): a free-form JSON-LD object (schema.org structured data), must include `@context` and `@type` when present. Emitted as a `<script type="application/ld+json">` block in the static compiler output — see `mitosis-compiler-spec.md`.
- `root`: a single element node (recursive). Element node: `{ tag, attributes?, children? }`.
- `attributes`: map `name → value`. Value is one of:
  - a literal (`string | boolean | number`);
  - dynamic `{ "bind": "<JS expression>" }` (expression references `props.*`/`state.*`);
  - event `{ "on": "<JS expression>" }` — the **attribute key itself** is the event name (e.g. `onClick`, `onInput`); the expression references `props.*`/`state.*` and may assign state (`state.count = state.count + 1`).
- `children`: list of nodes. Each node is one of four kinds:
  - **element**: `{ tag, attributes?, children? }`.
  - **text**: `{ "text": "<literal>" }` or `{ "text": { "bind": "<expression>" } }`.
  - **conditional**: `{ "show": { "bind": "<boolean expression>", "focusOnShow"?: true }, "children": [...] }` — renders `children` only when the expression is truthy. `focusOnShow` (v1.2, optional): moves focus to the first focusable child every time the expression transitions to truthy, not just on the component's initial mount — verified via Mitosis's dependency-tracked `onUpdate` hook (`useEffect(..., [deps])` in React, `computed`+`watch` in Vue), see `mitosis-compiler-spec.md`.
  - **loop**: `{ "for": { "each": "<list expression>", "as": "<item name>" }, "children": [...] }` — repeats `children` for each item in `each`; `as` is available as a binding inside that scope (e.g. `{ "text": { "bind": "item" } }`).
- State/events/conditional/loop are all optional — a v0 AST (just props → attributes/text) stays valid.

## Non-goals (v1 / v1.2)
- Doesn't model slots, context, hooks, forms with validation — out of scope.
- Focus-on-appear for `show` is solved (v1.2, `focusOnShow`). **Focus management for `for` is still an open item** — what happens to focus when a focused list item is removed needs runtime tracking (which item had focus, move to a sensible neighbor), not a simple dependency-effect like `focusOnShow`. Not solved in this version, not pretended to be — revisit once there's a real list component to test against, not in the abstract.
- **Known gap: `PropType` doesn't model lists.** A prop bound as a `for`'s `each` (like `Counter`'s `items`) is actually a list at runtime, but `type` only allows `string | boolean | number` — there's no `"array"` type yet. Its declared `type` is a scalar placeholder, and its `example` (when the prop is used this way) has to be a real array despite `type: "string"` saying otherwise — JSON doesn't enforce it, but it's a real inconsistency, not a clean design. Fix is adding a proper list/array `PropType` — tracked, not done here.
