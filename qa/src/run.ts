// QA-001 runner — see .specs/qa-automation-spec.md
import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const REFLOW_VIEWPORT = { width: 320, height: 640 }; // SC 1.4.10 — see .specs/qa-automation-spec.md
const COMPILER_OUT_DIR = path.join(__dirname, "..", "..", "compiler", "out");
const REPORT_DIR = path.join(__dirname, "..", "out");

interface ComponentTarget {
  name: string;
  htmlPath: string;
}

function resolveTargets(requested: string[]): ComponentTarget[] {
  if (requested.length > 0) {
    return requested.map((name) => {
      const htmlPath = path.join(COMPILER_OUT_DIR, name, "qa", `${name}.html`);
      if (!fs.existsSync(htmlPath)) {
        throw new Error(
          `qa-html output missing for '${name}' (expected ${htmlPath}) — run the compiler first (compiler/dist/compile.js), this is not a skip`
        );
      }
      return { name, htmlPath };
    });
  }

  if (!fs.existsSync(COMPILER_OUT_DIR)) {
    throw new Error(`no compiler output found at ${COMPILER_OUT_DIR} — run the compiler first`);
  }
  return fs
    .readdirSync(COMPILER_OUT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      htmlPath: path.join(COMPILER_OUT_DIR, entry.name, "qa", `${entry.name}.html`),
    }))
    .filter((target) => fs.existsSync(target.htmlPath));
}

async function checkReflow(page: import("playwright").Page): Promise<{ ok: boolean; scrollWidth: number }> {
  await page.setViewportSize(REFLOW_VIEWPORT);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  return { ok: scrollWidth <= REFLOW_VIEWPORT.width, scrollWidth };
}

async function main() {
  const requested = process.argv.slice(2);
  const targets = resolveTargets(requested);

  if (targets.length === 0) {
    console.error("[abort] no qa-html targets found — run the compiler first");
    process.exit(1);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch();
  let anyViolations = false;

  try {
    for (const target of targets) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`file://${target.htmlPath}`);

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const reflow = await checkReflow(page);
      await context.close();

      const reportPath = path.join(REPORT_DIR, `${target.name}.report.json`);
      fs.writeFileSync(reportPath, JSON.stringify({ ...results, reflow }, null, 2), "utf8");

      const failed = results.violations.length > 0 || !reflow.ok;
      if (!failed) {
        console.log(`[ok] ${target.name}: 0 WCAG 2.2 AA violations, reflow OK at 320px -> ${reportPath}`);
      } else {
        anyViolations = true;
        console.error(`[fail] ${target.name}: ${results.violations.length} violation(s) -> ${reportPath}`);
        for (const v of results.violations) {
          console.error(`  - [${v.impact}] ${v.id}: ${v.help}`);
        }
        if (!reflow.ok) {
          console.error(`  - [reflow] SC 1.4.10: content is ${reflow.scrollWidth}px wide, exceeds 320px viewport`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  process.exit(anyViolations ? 1 : 0);
}

main().catch((err) => {
  console.error(`[abort] ${(err as Error).message}`);
  process.exit(1);
});
