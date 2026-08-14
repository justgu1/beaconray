// React's DOM `style` prop needs an object, not a string. A *literal*
// `style` value is already fixed at the AST-to-Mitosis layer
// (ast-to-mitosis.ts) by converting it into an object-expression binding
// before Mitosis ever generates code — see the `style`/`splitAttributes`
// comment there. A *dynamic* style (`{ bind: <expression> }`, e.g. a ternary
// picking between a few CSS-text strings — Container's `reverse` prop,
// Separator's `spacing` prop, Drawer's `position` prop) can't be fixed the
// same way: the expression is arbitrary JS, not safely parseable into an
// object literal at compile time. A naive "replace every string literal in
// the expression with an object" breaks expressions that mix CSS-text
// branches with unrelated string literals in the same expression — e.g.
// Drawer's `props.position === "top" ? "...": ...` compares against `"top"`,
// which is not CSS text and must stay a plain string comparison.
//
// Fix: post-process componentToReact()'s generated source specifically —
// wrap every `style={<expr>}` JSX attribute (skipping ones that already look
// like an object literal, i.e. already start with `{{`, which is the
// literal-style fix's output) in a small runtime helper that parses the
// resulting CSS-text string into a style object AT RUNTIME, once the
// expression has already evaluated to a plain string. The helper is inlined
// into the file itself — no import, no added dependency, matching the "zero
// extra runtime dependency" quality gate (component-quality-spec.md rule 4)
// since compiled components are meant to be self-contained, distributable
// files.
//
// Scoped to the react/*.tsx output only: Vue's `:style` binding already
// accepts a plain CSS-text string with no issue, and the static/SEO render
// (componentToTemplate) needs the *string* form to interpolate directly into
// baked HTML — touching either would break them for no reason.

const STYLE_HELPER_NAME = "__beaconrayStyleFromText";

const STYLE_HELPER_SOURCE = `function ${STYLE_HELPER_NAME}(cssText) {
  if (typeof cssText !== "string") return cssText;
  var result = {};
  cssText.split(";").forEach(function (decl) {
    var trimmed = decl.trim();
    if (!trimmed) return;
    var colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) return;
    var prop = trimmed
      .slice(0, colonIndex)
      .trim()
      .replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    var value = trimmed.slice(colonIndex + 1).trim();
    result[prop] = value;
  });
  return result;
}`;

function findMatchingBrace(text: string, openBraceIndex: number): number {
  let depth = 1;
  let i = openBraceIndex + 1;
  let inString: string | null = null;

  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
    } else if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
    }
    i += 1;
  }

  return i - 1;
}

export function fixDynamicStyleForReact(code: string): string {
  const marker = "style={";
  let result = "";
  let cursor = 0;
  let usedHelper = false;

  while (true) {
    const start = code.indexOf(marker, cursor);
    if (start === -1) {
      result += code.slice(cursor);
      break;
    }

    const openBraceIndex = start + marker.length - 1;
    const exprStart = openBraceIndex + 1;

    if (code[exprStart] === "{") {
      // style={{ ... }} — already an object literal (the literal-style fix's
      // output), nothing to do here.
      result += code.slice(cursor, exprStart);
      cursor = exprStart;
      continue;
    }

    const closeBraceIndex = findMatchingBrace(code, openBraceIndex);
    const expr = code.slice(exprStart, closeBraceIndex);
    result += code.slice(cursor, start) + `style={${STYLE_HELPER_NAME}(${expr})}`;
    usedHelper = true;
    cursor = closeBraceIndex + 1;
  }

  if (!usedHelper) {
    return result;
  }

  const lastImportLineEnd = result.lastIndexOf("import");
  const insertAt = result.indexOf("\n", lastImportLineEnd) + 1;
  return `${result.slice(0, insertAt)}\n${STYLE_HELPER_SOURCE}\n${result.slice(insertAt)}`;
}
