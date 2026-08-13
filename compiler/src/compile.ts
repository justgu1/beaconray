// Entry point for the prototype pipeline — see .specs/mitosis-compiler-spec.md
import * as fs from "fs";
import * as path from "path";
import { componentToMitosis, componentToReact, componentToVue } from "@builder.io/mitosis";
import { astToMitosisComponent } from "./ast-to-mitosis";
import { buildExampleProps, renderStaticHtml } from "./render-static";
import { validateAst } from "./validate";
import { ComponentAst } from "./types";

function wrapAstro(html: string): string {
  // Mitosis 0.14.0 has no native "astro" target (see mitosis-compiler-spec.md,
  // step 6/7). This wraps the genuinely static, baked-text HTML from
  // render-static.ts in a minimal Astro component shell.
  return `---\n---\n${html}`;
}

function wrapQaHtml(name: string, html: string): string {
  // Standalone document for QA-001 (Playwright + axe-core, see
  // .specs/qa-automation-spec.md). `lang` and `title` are required here —
  // axe-core flags their absence at the document level, which is noise
  // unrelated to the component being tested. Links the Beaconray Theme
  // tokens (.specs/theme-spec.md) so components using var(--br-*) in style
  // actually resolve to real colors — otherwise axe's contrast checks would
  // have nothing real to evaluate.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${name}</title>
    <link rel="stylesheet" href="../../_theme/tokens.css" />
  </head>
  <body>
    ${html}
  </body>
</html>
`;
}

function writeFile(outDir: string, relPath: string, content: string) {
  const fullPath = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
  return fullPath;
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node dist/compile.js <path-to-ast.json>");
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    validateAst(parsed);
  } catch (err) {
    console.error(`[abort] ${(err as Error).message}`);
    process.exit(1);
  }
  const ast = parsed as ComponentAst;

  const component = astToMitosisComponent(ast);
  const outDir = path.join(__dirname, "..", "out", ast.name);
  const exampleProps = buildExampleProps(ast);

  // Beaconray Theme tokens (.specs/theme-spec.md) — shared asset, copied
  // once, not duplicated per component.
  const themeSrc = path.join(__dirname, "..", "theme", "tokens.css");
  const themeOut = path.join(__dirname, "..", "out", "_theme", "tokens.css");
  fs.mkdirSync(path.dirname(themeOut), { recursive: true });
  fs.copyFileSync(themeSrc, themeOut);

  const targets: Array<{ label: string; run: () => { relPath: string; content: string } }> = [
    {
      label: "mitosis (.lite.tsx)",
      run: () => ({
        relPath: `${ast.name}.lite.tsx`,
        content: componentToMitosis()({ component }),
      }),
    },
    {
      label: "react",
      run: () => ({
        relPath: path.join("react", `${ast.name}.tsx`),
        content: componentToReact()({ component }),
      }),
    },
    {
      label: "vue",
      run: () => ({
        relPath: path.join("vue", `${ast.name}.vue`),
        content: componentToVue()({ component }),
      }),
    },
    {
      label: "astro",
      run: () => ({
        relPath: path.join("astro", `${ast.name}.astro`),
        content: wrapAstro(renderStaticHtml(component, exampleProps)),
      }),
    },
    {
      label: "qa-html",
      run: () => ({
        relPath: path.join("qa", `${ast.name}.html`),
        content: wrapQaHtml(ast.name, renderStaticHtml(component, exampleProps)),
      }),
    },
  ];

  for (const target of targets) {
    try {
      const { relPath, content } = target.run();
      const written = writeFile(outDir, relPath, content);
      console.log(`[ok] ${target.label} -> ${written}`);
    } catch (err) {
      console.error(`[fail] ${target.label}:`, (err as Error).message);
    }
  }
}

main();
