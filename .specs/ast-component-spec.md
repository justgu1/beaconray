# Spec — Component AST (`ast-component-spec`)

## Context
Format of the AST describing a visual component, framework-agnostic. Consumed by the compiler (`mitosis-compiler-spec.md`) to generate `.lite.tsx` (Mitosis) and then React/Vue/Astro. Today it's hand-authored JSON (Studio doesn't exist yet — ADR-004); later the Studio produces the same format.

**v1** (ADR-006): adds `state`, events, conditional (`show`) and loop (`for`) — v0 only covered props → attributes/text, static. Every valid v0 AST stays valid under v1 (additive extension, no breaking change).

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
- `props`: list of `{ name, type, required, enum? }`. `type` is `string | boolean | number`.
- `state?`: list of `{ name, type, initial }` — local component state. `initial` is a literal (`string | boolean | number`) matching the declared type. Absent = stateless component (v0).
- `root`: a single element node (recursive). Element node: `{ tag, attributes?, children? }`.
- `attributes`: map `name → value`. Value is one of:
  - a literal (`string | boolean | number`);
  - dynamic `{ "bind": "<JS expression>" }` (expression references `props.*`/`state.*`);
  - event `{ "on": "<JS expression>" }` — the **attribute key itself** is the event name (e.g. `onClick`, `onInput`); the expression references `props.*`/`state.*` and may assign state (`state.count = state.count + 1`).
- `children`: list of nodes. Each node is one of four kinds:
  - **element**: `{ tag, attributes?, children? }`.
  - **text**: `{ "text": "<literal>" }` or `{ "text": { "bind": "<expression>" } }`.
  - **conditional**: `{ "show": { "bind": "<boolean expression>" }, "children": [...] }` — renders `children` only when the expression is truthy.
  - **loop**: `{ "for": { "each": "<list expression>", "as": "<item name>" }, "children": [...] }` — repeats `children` for each item in `each`; `as` is available as a binding inside that scope (e.g. `{ "text": { "bind": "item" } }`).
- State/events/conditional/loop are all optional — a v0 AST (just props → attributes/text) stays valid.

## Non-goals (v1)
- Doesn't model slots, context, hooks, forms with validation — out of scope.
- Focus management around `show`/`for` (what receives focus when a block appears/disappears, what happens when a focused list item is removed) is an open item — not solved in this version, not pretended to be.
