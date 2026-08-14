// AST format — see .specs/ast-component-spec.md

export type PropType = "string" | "boolean" | "number";

export interface ComponentProp {
  name: string;
  type: PropType;
  required?: boolean;
  enum?: string[];
  example?: string | number | boolean;
}

export interface StateVar {
  name: string;
  type: PropType;
  initial: string | number | boolean;
  // Optional, v1.3 (ast-component-spec.md) — the value baked into the
  // static/SEO render (Astro, qa-html) instead of `initial`. Needed because
  // `render-static.ts` bakes state at generation time (no runtime), so a
  // state var that gates real content (e.g. an overlay's `open`) would
  // otherwise always render closed to crawlers/axe-core, regardless of what
  // makes sense for the interactive React/Vue targets. Falls back to
  // `initial` when absent — fully additive, no existing AST changes meaning.
  staticValue?: string | number | boolean;
}

export type AttributeValue =
  | string
  | boolean
  | number
  | { bind: string }
  | { on: string };

export interface ElementNode {
  tag: string;
  attributes?: Record<string, AttributeValue>;
  children?: AstNode[];
}

export interface TextNode {
  text: string | { bind: string };
}

export interface ShowNode {
  show: { bind: string; focusOnShow?: boolean };
  children: AstNode[];
}

export interface ForNode {
  for: { each: string; as: string };
  children: AstNode[];
}

export type AstNode = ElementNode | TextNode | ShowNode | ForNode;

export interface ComponentAst {
  name: string;
  props: ComponentProp[];
  state?: StateVar[];
  schema?: Record<string, unknown>;
  root: ElementNode;
}

export function isTextNode(node: AstNode): node is TextNode {
  return "text" in node;
}

export function isShowNode(node: AstNode): node is ShowNode {
  return "show" in node;
}

export function isForNode(node: AstNode): node is ForNode {
  return "for" in node;
}

export function isElementNode(node: AstNode): node is ElementNode {
  return "tag" in node;
}

export function isBinding(value: unknown): value is { bind: string } {
  return typeof value === "object" && value !== null && "bind" in (value as object);
}

export function isEventBinding(value: unknown): value is { on: string } {
  return typeof value === "object" && value !== null && "on" in (value as object);
}

const NATIVE_INTERACTIVE_TAGS = new Set(["button", "a", "input", "select", "textarea"]);

export function isNativeInteractiveTag(tag: string): boolean {
  return NATIVE_INTERACTIVE_TAGS.has(tag);
}
