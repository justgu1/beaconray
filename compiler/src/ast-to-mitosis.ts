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
  isShowNode,
  isTextNode,
} from "./types";

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

function nodeToMitosis(node: AstNode): any {
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
    return createMitosisNode({
      name: "Show",
      bindings: { when: { code: node.show.bind, bindingType: "expression", type: "single" } },
      children: node.children.map(nodeToMitosis),
    });
  }

  if (isForNode(node)) {
    return createMitosisNode({
      name: "For",
      scope: { forName: node.for.as },
      bindings: { each: { code: node.for.each, bindingType: "expression", type: "single" } },
      children: node.children.map(nodeToMitosis),
    });
  }

  const element = node as ElementNode;
  const { properties, bindings } = splitAttributes(element.attributes);

  return createMitosisNode({
    name: element.tag,
    properties,
    bindings,
    children: (element.children ?? []).map(nodeToMitosis),
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

  return {
    "@type": "@builder.io/mitosis/component",
    imports: [],
    exports: {},
    inputs: ast.props.map((p) => ({ name: p.name, type: p.type, defaultValue: undefined })),
    meta: {},
    refs: {},
    state,
    children: [nodeToMitosis(ast.root)],
    context: { get: {}, set: {} },
    subComponents: [],
    name: ast.name,
    hooks: { onMount: [], onEvent: [] },
  };
}
