// Entry point for the prototype pipeline — see .specs/mitosis-compiler-spec.md
import * as fs from "fs";
import * as path from "path";
import { componentToMitosis, componentToReact, componentToVue, componentToHtml } from "@builder.io/mitosis";
import { astToMitosisComponent } from "./ast-to-mitosis";
import { validateAst } from "./validate";
import { ComponentAst } from "./types";

function wrapAstro(html: string): string {
  // Mitosis 0.14.0 has no native "astro" target (see mitosis-compiler-spec.md,
  // step 6). This wraps the plain HTML/JS output from componentToHtml in a
  // minimal Astro component shell as a documented workaround.
  return `---\n---\n${html}`;
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
        content: wrapAstro(componentToHtml()({ component })),
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
