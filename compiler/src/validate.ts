import { ComponentAst } from "./types";

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
  if (!ast.root || typeof ast.root !== "object" || typeof ast.root.tag !== "string") {
    throw new Error("Invalid AST: missing 'root' field or missing 'tag'");
  }
}
