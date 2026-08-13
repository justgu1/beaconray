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
    return templateFn(exampleProps);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}
