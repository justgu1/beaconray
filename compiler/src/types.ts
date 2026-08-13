// AST format — see .specs/ast-component-spec.md

export type PropType = "string" | "boolean" | "number";

export interface ComponentProp {
  name: string;
  type: PropType;
  required?: boolean;
  enum?: string[];
}

export type AttributeValue =
  | string
  | boolean
  | number
  | { bind: string };

export interface ElementNode {
  tag: string;
  attributes?: Record<string, AttributeValue>;
  children?: AstNode[];
}

export interface TextNode {
  text: string | { bind: string };
}

export type AstNode = ElementNode | TextNode;

export interface ComponentAst {
  name: string;
  props: ComponentProp[];
  root: ElementNode;
}

export function isTextNode(node: AstNode): node is TextNode {
  return "text" in node;
}

export function isBinding(value: unknown): value is { bind: string } {
  return typeof value === "object" && value !== null && "bind" in (value as object);
}
