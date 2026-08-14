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

function splitAttributes(attributes: Record<string, AttributeValue> | undefined) {
  const properties: Record<string, any> = {};
  const bindings: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (isEventBinding(value)) {
      bindings[key] = { code: value.on, bindingType: "function", type: "single" };
    } else if (isBinding(value)) {
      bindings[key] = { code: value.bind, bindingType: "expression", type: "single" };
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
      const refName = nextRefName(ctx);
      ctx.refs[refName] = { argument: "null" };
      ctx.onUpdate.push({
        code: `if (${node.show.bind}) { ${refName}.focus(); }`,
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

export function astToMitosisComponent(ast: ComponentAst, opts?: { forStatic?: boolean }): MitosisComponent {
  const state: Record<string, any> = {};
  for (const s of ast.state ?? []) {
    // Shape verified against Mitosis's `useStore` hook parsing (0.14.0) —
    // see .specs/mitosis-compiler-spec.md. `useState` does NOT populate this
    // field in this version, so `useStore`'s shape is the one we target.
    // `forStatic` (ADR-014, resolves the ADR-013 gap): the static/SEO render
    // has no runtime, so a state var gating real content needs its own
    // baked value, distinct from the interactive targets' real `initial`.
    const value = opts?.forStatic && s.staticValue !== undefined ? s.staticValue : s.initial;
    state[s.name] = { code: JSON.stringify(value), type: "property", propertyType: "normal" };
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
