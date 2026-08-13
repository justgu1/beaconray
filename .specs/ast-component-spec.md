# Spec — Component AST (`ast-component-spec`)

## Context
Format of the AST describing a visual component, framework-agnostic. Consumed by the compiler (`mitosis-compiler-spec.md`) to generate `.lite.tsx` (Mitosis) and then React/Vue/Astro. Today it's hand-authored JSON (Studio doesn't exist yet — ADR-004); later the Studio produces the same format.

## Format

```json
{
  "name": "Button",
  "props": [
    { "name": "label", "type": "string", "required": true },
    { "name": "disabled", "type": "boolean", "required": false },
    { "name": "variant", "type": "string", "enum": ["primary", "secondary"], "required": false }
  ],
  "root": {
    "tag": "button",
    "attributes": {
      "aria-label": { "bind": "props.label" },
      "disabled": { "bind": "props.disabled" },
      "class": { "bind": "props.variant === \"primary\" ? \"btn btn-primary\" : \"btn btn-secondary\"" }
    },
    "children": [
      { "text": { "bind": "props.label" } }
    ]
  }
}
```

## Rules

- `name`: PascalCase, component name.
- `props`: list of `{ name, type, required, enum? }`. `type` is `string | boolean | number`.
- `root`: a single element node (recursive). Element node: `{ tag, attributes?, children? }`.
- `attributes`: map `name → value`. Value is a literal (`string | boolean | number`) or dynamic `{ "bind": "<JS expression>" }` (expression references `props.*`).
- `children`: list of nodes. Each node is an element (`tag`) or text (`{ "text": "<literal>" }` or `{ "text": { "bind": "<expression>" } }`).
- No local state, no events in this v0 — just props → attributes/text. Extensions (events, state, loops/`for`, conditionals/`show`) get their own spec when implemented, not a silent retrofit here.

## Non-goals (v0)
- Doesn't model slots, context, hooks — out of scope for the pilot.
