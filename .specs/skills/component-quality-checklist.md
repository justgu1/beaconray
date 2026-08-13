# Skill — Component Quality Checklist

Run this before marking any component AST or compiled output as done. References `.specs/component-quality-spec.md` — read that first for the "why" behind each item.

## Checklist

- [ ] **Semantic HTML5**: every node with an event binding uses a native interactive tag (`button`/`a`/`input`/`select`/`textarea`) or has an explicit `role`.
- [ ] **Accessible name**: every interactive element has visible text, `aria-label`, or `aria-labelledby`.
- [ ] **Images**: every `img` node has `alt` (empty string only if genuinely decorative).
- [ ] **Tabindex**: no positive `tabindex` anywhere in the tree.
- [ ] **Form fields**: every form field has an associated label.
- [ ] **Multi-modal**: nothing depends on a mouse/pointer-only handler; keyboard operability confirmed by the semantic-tag check above.
- [ ] **Dynamic content**: any state-driven change not triggered by the user's own action on that element uses `aria-live`.
- [ ] **Animation**: no hardcoded duration/easing value; references a theme token; respects `prefers-reduced-motion`.
- [ ] **Performance budget**: compiled output size checked against the documented budget (≤2KB gzip default for a simple component); no extra runtime dependency beyond the target framework.

## Exit criteria
Every box checked, or an explicit written deviation (what, why, and what it costs) — never a silent skip.

## Usage
Run manually today (no automated enforcement yet — see `.specs/component-qa-strategy-spec.md` for the QA layers that will eventually cover parts of this). Apply per component, before it's considered the "official" version of anything (fixtures used only to validate the compiler pipeline, like `compiler/examples/button.ast.json`, are exempt until they're promoted to a real component).
