import {
  AstNode,
  ComponentAst,
  ElementNode,
  isBinding,
  isElementNode,
  isEventBinding,
  isForNode,
  isNativeInteractiveTag,
  isShowNode,
  isTextNode,
} from "./types";

export function validateAst(ast: any): asserts ast is ComponentAst {
  if (!ast || typeof ast !== "object") {
    throw new Error("Invalid AST: root is not an object");
  }
  if (typeof ast.name !== "string" || !ast.name) {
    throw new Error("Invalid AST: missing or empty 'name' field");
  }
  if (!Array.isArray(ast.props)) {
    throw new Error("Invalid AST: 'props' must be an array (even if empty)");
  }
  if (ast.state !== undefined && !Array.isArray(ast.state)) {
    throw new Error("Invalid AST: 'state', when present, must be an array");
  }
  if (!ast.root || typeof ast.root !== "object" || typeof ast.root.tag !== "string") {
    throw new Error("Invalid AST: missing 'root' field or missing 'tag'");
  }

  validateQualityGate(ast.root as ElementNode, ast.name);
}

// Quality-gate validation (v1) — see .specs/mitosis-compiler-spec.md,
// "Quality-gate validation" section. Only the statically-checkable subset of
// .specs/component-quality-spec.md is enforced here.
function validateQualityGate(node: AstNode, componentName: string, path: string = "root") {
  if (isElementNode(node)) {
    const attrs = node.attributes ?? {};
    const hasEvent = Object.values(attrs).some((value) => isEventBinding(value));
    const hasExplicitRole = typeof attrs.role === "string" && attrs.role.length > 0;

    if (hasEvent && !isNativeInteractiveTag(node.tag) && !hasExplicitRole) {
      throw new Error(
        `[${componentName}] ${path}: node with an event binding uses non-interactive tag <${node.tag}> without an explicit 'role' attribute (component-quality-spec.md, rule 1)`
      );
    }

    const isInteractive = isNativeInteractiveTag(node.tag) || (hasEvent && hasExplicitRole);
    if (isInteractive) {
      const hasAccessibleName =
        typeof attrs["aria-label"] === "string" ||
        isBinding(attrs["aria-label"]) ||
        typeof attrs["aria-labelledby"] === "string" ||
        isBinding(attrs["aria-labelledby"]) ||
        hasVisibleText(node.children ?? []);
      if (!hasAccessibleName) {
        throw new Error(
          `[${componentName}] ${path}: interactive <${node.tag}> has no accessible name — needs visible text, 'aria-label', or 'aria-labelledby' (component-quality-spec.md, rule 2)`
        );
      }
    }

    if (node.tag === "img" && attrs.alt === undefined) {
      throw new Error(`[${componentName}] ${path}: <img> is missing 'alt' (component-quality-spec.md, rule 2)`);
    }

    if (typeof attrs.tabindex === "number" && attrs.tabindex > 0) {
      throw new Error(
        `[${componentName}] ${path}: <${node.tag}> has a positive 'tabindex' (${attrs.tabindex}) (component-quality-spec.md, rule 2)`
      );
    }

    (node.children ?? []).forEach((child, i) => validateQualityGate(child, componentName, `${path}>${node.tag}[${i}]`));
    return;
  }

  if (isShowNode(node) || isForNode(node)) {
    node.children.forEach((child, i) => validateQualityGate(child, componentName, `${path}>${"show" in node ? "show" : "for"}[${i}]`));
    return;
  }

  // text node: nothing to check
}

function hasVisibleText(children: AstNode[]): boolean {
  return children.some((child) => {
    if (isTextNode(child)) {
      return typeof child.text === "string" ? child.text.trim().length > 0 : true;
    }
    if (isElementNode(child)) {
      return hasVisibleText(child.children ?? []);
    }
    if (isShowNode(child) || isForNode(child)) {
      return hasVisibleText(child.children);
    }
    return false;
  });
}
