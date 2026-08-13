// Static HTML rendering for SEO/GEO — see .specs/mitosis-compiler-spec.md
// (step 6) and ADR-009 in .specs/ADRS.md.
//
// componentToTemplate() is a code generator: it returns the *source* of a JS
// function ("export default function template(props) { return `<html>`; }"),
// not a callable value. To actually get baked-HTML text out of it, we
// transform that source into a requireable CommonJS module and execute it
// with example prop values.
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { componentToTemplate, MitosisComponent } from "@builder.io/mitosis";
import { ComponentAst, PropType } from "./types";

const EXPORT_DEFAULT_PREFIX = "export default function template(";
const MODULE_EXPORTS_PREFIX = "module.exports = function template(";

let tmpFileCounter = 0;

function defaultExampleValue(type: PropType): string | number | boolean {
  if (type === "string") return "";
  if (type === "boolean") return false;
  return 0;
}

export function buildExampleProps(ast: ComponentAst): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const p of ast.props) {
    props[p.name] = p.example !== undefined ? p.example : defaultExampleValue(p.type);
  }
  return props;
}

// componentToTemplate serializes a `false` boolean attribute literally
// (disabled={false} -> disabled="false"), which per HTML boolean-attribute
// semantics is still truthy — the browser treats the element as disabled
// regardless of the string value. Confirmed this isn't just cosmetic: a
// disabled element is excluded from axe-core's color-contrast rule
// entirely, silently defeating the theme-token contrast verification this
// static render exists to support. Fixed here rather than left as a
// documented-only gap (see mitosis-compiler-spec.md), since it was actively
// masking a real check.
const BOOLEAN_ATTRIBUTES = ["disabled", "checked", "selected", "readonly", "required", "multiple", "hidden"];
const FALSE_BOOLEAN_ATTR_RE = new RegExp(`\\s(?:${BOOLEAN_ATTRIBUTES.join("|")})="false"`, "g");
const TRUE_BOOLEAN_ATTR_RE = new RegExp(`(\\s(?:${BOOLEAN_ATTRIBUTES.join("|")}))="true"`, "g");

function fixBooleanAttributes(html: string): string {
  return html.replace(FALSE_BOOLEAN_ATTR_RE, "").replace(TRUE_BOOLEAN_ATTR_RE, "$1");
}

export function renderStaticHtml(component: MitosisComponent, exampleProps: Record<string, unknown>): string {
  const templateSrc = componentToTemplate()({ component });
  if (!templateSrc.includes(EXPORT_DEFAULT_PREFIX)) {
    throw new Error(
      `componentToTemplate output doesn't match the expected shape (missing '${EXPORT_DEFAULT_PREFIX}') — Mitosis version may have changed, update render-static.ts`
    );
  }
  const moduleSrc = templateSrc.replace(EXPORT_DEFAULT_PREFIX, MODULE_EXPORTS_PREFIX);

  tmpFileCounter += 1;
  const tmpFile = path.join(os.tmpdir(), `beaconray-static-${component.name}-${process.pid}-${tmpFileCounter}.js`);
  fs.writeFileSync(tmpFile, moduleSrc, "utf8");
  try {
    // Fresh require every time — nothing should ever be cached across calls.
    delete require.cache[require.resolve(tmpFile)];
    const templateFn = require(tmpFile) as (props: Record<string, unknown>) => string;
    return fixBooleanAttributes(templateFn(exampleProps));
  } finally {
    fs.unlinkSync(tmpFile);
  }
}
