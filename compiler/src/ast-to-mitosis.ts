// Converts a component AST (.specs/ast-component-spec.md) into a Mitosis
// component JSON tree, using Mitosis's own `createMitosisNode` helper so the
// shape matches exactly what `parseJsx` would have produced.
import { createMitosisNode, MitosisComponent } from "@builder.io/mitosis";
import { AstNode, AttributeValue, ComponentAst, ElementNode, isBinding, isTextNode } from "./types";

function splitAttributes(attributes: Record<string, AttributeValue> | undefined) {
  const properties: Record<string, any> = {};
  const bindings: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (isBinding(value)) {
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
  return {
    "@type": "@builder.io/mitosis/component",
    imports: [],
    exports: {},
    inputs: ast.props.map((p) => ({ name: p.name, type: p.type, defaultValue: undefined })),
    meta: {},
    refs: {},
    state: {},
    children: [nodeToMitosis(ast.root)],
    context: { get: {}, set: {} },
    subComponents: [],
    name: ast.name,
    hooks: { onMount: [], onEvent: [] },
  };
}
