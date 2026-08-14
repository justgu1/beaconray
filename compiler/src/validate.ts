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
  if (ast.schema !== undefined) {
    if (typeof ast.schema !== "object" || ast.schema === null || Array.isArray(ast.schema)) {
      throw new Error("Invalid AST: 'schema', when present, must be an object");
    }
    if (!("@context" in ast.schema) || !("@type" in ast.schema)) {
      throw new Error(
        "Invalid AST: 'schema' is missing '@context' or '@type' — JSON-LD without these isn't usable by any crawler (component-quality-spec.md, rule 6)"
      );
    }
  }

  validateQualityGate(ast.root as ElementNode, ast.name);
  validateAriaLive(ast.root as ElementNode, false, false, ast.name);
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

    if (node.tag === "a" && attrs.href === undefined) {
      throw new Error(
        `[${componentName}] ${path}: <a> is missing 'href' — a link with no href doesn't exist to any crawler (component-quality-spec.md, rule 6)`
      );
    }

    if (typeof attrs.tabindex === "number" && attrs.tabindex > 0) {
      throw new Error(
        `[${componentName}] ${path}: <${node.tag}> has a positive 'tabindex' (${attrs.tabindex}) (component-quality-spec.md, rule 2)`
      );
    }

    if (typeof attrs.style === "string") {
      validateThemeTokens(attrs.style, componentName, path, node.tag);
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

// Theming/responsiveness enforcement (component-quality-spec.md rules 5 & 8,
// see .specs/theme-spec.md) — checks the *literal* `style` string only; a
// style built from a bind expression isn't reachable here (documented gap,
// falls back to the manual checklist).
const VAR_CALL_RE = /var\([^)]*\)/g;
const RAW_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/;
const RAW_TIME_RE = /\b\d+(\.\d+)?m?s\b/;
// Negative lookbehind avoids matching "width" inside "border-width" while
// still matching "max-width"/"min-width" as whole property names.
const FIXED_PX_SIZE_RE = /(?<![a-zA-Z-])(width|height|max-width|max-height|min-width|min-height)\s*:\s*\d+(\.\d+)?px\b/;

function validateThemeTokens(style: string, componentName: string, path: string, tag: string) {
  const withoutVarCalls = style.replace(VAR_CALL_RE, "");

  if (RAW_COLOR_RE.test(withoutVarCalls)) {
    throw new Error(
      `[${componentName}] ${path}: <${tag}> style has a raw color value outside var(...) — use a --br-color-* token instead (component-quality-spec.md, rule 5)`
    );
  }
  if (RAW_TIME_RE.test(withoutVarCalls)) {
    throw new Error(
      `[${componentName}] ${path}: <${tag}> style has a raw time value outside var(...) — use a --br-duration-* token instead (component-quality-spec.md, rule 5)`
    );
  }
  if (FIXED_PX_SIZE_RE.test(style)) {
    throw new Error(
      `[${componentName}] ${path}: <${tag}> style has a fixed pixel width/height — use relative units instead (component-quality-spec.md, rule 8)`
    );
  }
}

// aria-live enforcement (component-quality-spec.md rule 3, v1.2) — a node
// whose text/attribute binds to state.* needs 'aria-live' (self or
// ancestor) unless it's inside (itself or a descendant of) an element with
// any event binding. Heuristic: exempts by "any event nearby," not by
// tracing which exact state variable that event modifies — documented
// simplification, see .specs/component-quality-spec.md rule 3.
const STATE_REF_RE = /\bstate\./;

function validateAriaLive(node: AstNode, ownedByEvent: boolean, insideLiveRegion: boolean, componentName: string, path: string = "root") {
  if (isTextNode(node)) {
    if (isBinding(node.text) && STATE_REF_RE.test(node.text.bind) && !ownedByEvent && !insideLiveRegion) {
      throw new Error(
        `[${componentName}] ${path}: text bound to state ('${node.text.bind}') has no 'aria-live' region and isn't inside an element with an event binding (component-quality-spec.md, rule 3)`
      );
    }
    return;
  }

  if (isShowNode(node) || isForNode(node)) {
    const kind = isShowNode(node) ? "show" : "for";
    node.children.forEach((child, i) => validateAriaLive(child, ownedByEvent, insideLiveRegion, componentName, `${path}>${kind}[${i}]`));
    return;
  }

  const attrs = node.attributes ?? {};
  const hasEvent = Object.values(attrs).some((value) => isEventBinding(value));
  const hasAriaLive = attrs["aria-live"] !== undefined;
  const nowOwned = ownedByEvent || hasEvent;
  const nowLive = insideLiveRegion || hasAriaLive;

  if (!nowOwned && !nowLive) {
    for (const [key, value] of Object.entries(attrs)) {
      if (isBinding(value) && STATE_REF_RE.test(value.bind)) {
        throw new Error(
          `[${componentName}] ${path}: <${node.tag}> attribute '${key}' bound to state ('${value.bind}') has no 'aria-live' region and isn't inside an element with an event binding (component-quality-spec.md, rule 3)`
        );
      }
    }
  }

  (node.children ?? []).forEach((child, i) => validateAriaLive(child, nowOwned, nowLive, componentName, `${path}>${node.tag}[${i}]`));
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
