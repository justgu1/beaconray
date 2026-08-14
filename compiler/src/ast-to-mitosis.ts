// Converts a component AST (.specs/ast-component-spec.md) into a Mitosis
// component JSON tree, using Mitosis's own `createMitosisNode` helper so the
// shape matches exactly what `parseJsx` would have produced.
import { createMitosisNode, MitosisComponent } from "@builder.io/mitosis";
import {
  AstNode,
  AttributeValue,
  ComponentAst,
  ElementNode,
  isBinding,
  isEventBinding,
  isForNode,
  isNativeInteractiveTag,
  isShowNode,
  isTextNode,
} from "./types";

// Threaded through the recursive conversion so `show.focusOnShow` (v1.2,
// see .specs/mitosis-compiler-spec.md) can register a ref + onUpdate hook
// at the component level, not just the node level — Mitosis's refs/hooks
// live on the top-level component object, not per-node.
interface FocusContext {
  refs: Record<string, any>;
  onUpdate: any[];
  counter: { n: number };
}

function nextRefName(ctx: FocusContext): string {
  ctx.counter.n += 1;
  return `showRef${ctx.counter.n}`;
}

// React's DOM `style` prop requires an object, not a CSS-text string — a
// literal string throws at runtime ("The `style` prop expects a mapping from
// style properties to values, not a string"), confirmed by actually mounting
// a compiled component in a real React app (never exercised before: prior
// verification only ever read the generated code as text or ran axe-core
// against the static HTML output, neither of which invokes React's own
// runtime). Vue's output is unaffected either way — a literal style string is
// valid there. Converting a literal `style` string into an object-expression
// binding here (instead of leaving it in `properties`) fixes React while
// leaving Vue's behavior unchanged, since both go through this same
// conversion. Doesn't cover a *dynamic* `style` (`{ bind: <expression> }`) —
// that's a separate, more invasive fix (needs a runtime helper, since the
// expression can't be parsed at compile time) and is a known, tracked gap.
const CSS_PROPERTY_RE = /-([a-z])/g;

function cssTextToStyleObjectSource(cssText: string): string {
  const entries = cssText
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const colonIndex = decl.indexOf(":");
      const prop = decl.slice(0, colonIndex).trim();
      const value = decl.slice(colonIndex + 1).trim();
      const camelProp = prop.replace(CSS_PROPERTY_RE, (_, letter) => letter.toUpperCase());
      return `${JSON.stringify(camelProp)}: ${JSON.stringify(value)}`;
    });

  return `{ ${entries.join(", ")} }`;
}

function splitAttributes(attributes: Record<string, AttributeValue> | undefined) {
  const properties: Record<string, any> = {};
  const bindings: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (isEventBinding(value)) {
      bindings[key] = { code: value.on, bindingType: "function", type: "single" };
    } else if (isBinding(value)) {
      bindings[key] = { code: value.bind, bindingType: "expression", type: "single" };
    } else if (key === "style" && typeof value === "string") {
      bindings[key] = { code: cssTextToStyleObjectSource(value), bindingType: "expression", type: "single" };
    } else {
      properties[key] = value;
    }
  }

  return { properties, bindings };
}

function nodeToMitosis(node: AstNode, ctx: FocusContext): any {
  if (isTextNode(node)) {
    const { text } = node;
    if (isBinding(text)) {
      return createMitosisNode({
        name: "div",
        bindings: { _text: { code: text.bind, bindingType: "expression", type: "single" } },
      });
    }
    return createMitosisNode({ name: "div", properties: { _text: text } });
  }

  if (isShowNode(node)) {
    const children = node.children.map((c) => nodeToMitosis(c, ctx));

    if (node.show.focusOnShow) {
      // Verified shape (.specs/mitosis-compiler-spec.md): a ref + an
      // onUpdate hook with the show condition as its dependency compiles to
      // useEffect(() => {...}, [deps]) in React and computed+watch in Vue —
      // both re-fire on every transition, not just initial mount.
      // The ref guard (`${refName} &&`) matters specifically for Vue: its
      // `watch(..., { immediate: true })` compiles to fire eagerly at
      // component creation, including during SSR — where refs are never
      // populated (there's no real DOM yet). Without the guard, every
      // Vue SSR render of a mounted `show.focusOnShow` block throws
      // "Cannot read properties of undefined (reading 'focus')" — confirmed
      // by actually building a Vue island through Astro (SSRs by default,
      // even for `client:load`), never caught before since this code had
      // only ever been read as text or dynamically mounted client-only.
      // React's useEffect doesn't run during SSR at all, so it was never
      // affected — but the guard is harmless there too.
      const refName = nextRefName(ctx);
      ctx.refs[refName] = { argument: "null" };
      ctx.onUpdate.push({
        code: `if (${node.show.bind} && ${refName}) { ${refName}.focus(); }`,
        deps: `[${node.show.bind}]`,
        depsArray: [node.show.bind],
      });

      const first = children[0];
      if (first) {
        first.bindings = first.bindings ?? {};
        if (!("ref" in first.bindings)) {
          first.bindings.ref = { code: refName, bindingType: "expression", type: "single" };
        }
        const alreadyFocusable = isNativeInteractiveTag(first.name) || "tabIndex" in first.bindings;
        if (!alreadyFocusable) {
          first.bindings.tabIndex = { code: "-1", bindingType: "expression", type: "single" };
        }
      }
    }

    return createMitosisNode({
      name: "Show",
      bindings: { when: { code: node.show.bind, bindingType: "expression", type: "single" } },
      children,
    });
  }

  if (isForNode(node)) {
    return createMitosisNode({
      name: "For",
      scope: { forName: node.for.as },
      bindings: { each: { code: node.for.each, bindingType: "expression", type: "single" } },
      children: node.children.map((c) => nodeToMitosis(c, ctx)),
    });
  }

  const element = node as ElementNode;
  const { properties, bindings } = splitAttributes(element.attributes);

  return createMitosisNode({
    name: element.tag,
    properties,
    bindings,
    children: (element.children ?? []).map((c) => nodeToMitosis(c, ctx)),
  });
}

export function astToMitosisComponent(ast: ComponentAst): MitosisComponent {
  const state: Record<string, any> = {};
  for (const s of ast.state ?? []) {
    // Shape verified against Mitosis's `useStore` hook parsing (0.14.0) —
    // see .specs/mitosis-compiler-spec.md. `useState` does NOT populate this
    // field in this version, so `useStore`'s shape is the one we target.
    state[s.name] = { code: JSON.stringify(s.initial), type: "property", propertyType: "normal" };
  }

  const ctx: FocusContext = { refs: {}, onUpdate: [], counter: { n: 0 } };
  const rootNode = nodeToMitosis(ast.root, ctx);

  return {
    "@type": "@builder.io/mitosis/component",
    imports: [],
    exports: {},
    inputs: ast.props.map((p) => ({ name: p.name, type: p.type, defaultValue: undefined })),
    meta: {},
    refs: ctx.refs,
    state,
    children: [rootNode],
    context: { get: {}, set: {} },
    subComponents: [],
    name: ast.name,
    hooks: { onMount: [], onEvent: [], onUpdate: ctx.onUpdate },
  };
}
