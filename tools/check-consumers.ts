import { execFile } from "node:child_process";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";
import { build } from "vite";
import solid from "vite-plugin-solid";
import { checkConsumerBrowser } from "./check-consumer-browser.ts";

const run = promisify(execFile);
const root = new URL("../", import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "sheen-consumer-"));

function gzipBytes(value: string | Uint8Array): number { return gzipSync(value, { level: 9 }).byteLength; }

async function assertTokenCssBudgets(installed: string): Promise<void> {
  const core = await readFile(join(installed, "dist", "core.css"));
  const theme = await readFile(join(installed, "dist", "themes", "obsidian.css"));
  const accent = await readFile(join(installed, "dist", "accents", "jade.css"));
  const allThemes = await readFile(join(installed, "dist", "themes.css"));
  const selectedBytes = gzipBytes(Buffer.concat([core, theme, accent]));
  const allBytes = gzipBytes(Buffer.concat([core, allThemes]));
  assert.ok(selectedBytes < 12_000, `core + one theme + one accent is ${selectedBytes} gzip bytes, budget is <12000`);
  assert.ok(allBytes < 30_000, `core + all themes/accents is ${allBytes} gzip bytes, budget is <30000`);
  process.stdout.write(`Token CSS budgets passed: selected=${selectedBytes}B gzip, all=${allBytes}B gzip\n`);
}

async function assertUiBundleBudget(temporary: string, fixture: string, maximum?: number): Promise<void> {
  const entry = join(temporary, `${fixture}.mjs`);
  await cp(new URL(`tests/consumers/${fixture}.mjs`, root), entry);
  const built = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ["es"], fileName: fixture, cssFileName: fixture },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
  const chunks = outputs.filter(output => output.type === "chunk");
  const javascript = chunks.map(output => output.code).join("\n").replace(/^\/\/#(?:end)?region.*$/gmu, "");
  const retained = chunks.flatMap(output => Object.entries(output.modules)
    .filter(([, details]) => details.renderedLength > 0)
    .map(([id, details]) => ({ id, bytes: details.renderedLength })))
    .sort((left, right) => right.bytes - left.bytes);
  const bytes = gzipBytes(javascript);
  if (process.argv.includes("--report-bundles")) {
    process.stdout.write(`${fixture} retained modules:\n${retained.map(module => `${module.bytes}\t${module.id}`).join("\n")}\n`);
  }
  if (maximum === undefined) {
    process.stdout.write(`${fixture} measured baseline: ${bytes}B gzip\n`);
    return;
  }
  assert.ok(bytes < maximum, `${fixture} is ${bytes} gzip bytes, budget is <${maximum}; retained modules:\n${retained.map(module => `${module.bytes}\t${module.id}`).join("\n")}`);
  process.stdout.write(`${fixture} bundle budget passed: ${bytes}B gzip (<${maximum}B)\n`);
}

async function assertChartBundleBudget(temporary: string, charts: string, fixture: "chart-sparkline" | "chart-svg" | "chart-table" | "chart-time-series" | "chart-charts-svg" | "chart-streaming", expectedModule: string, maximum: number, includeCss: boolean, engine?: "uplot" | "d3"): Promise<void> {
  const entry = join(temporary, `${fixture}.mjs`);
  await cp(new URL(`tests/consumers/${fixture}.mjs`, root), entry);
  let retained: readonly string[] = [];
  const resolved = new Set<string>();
  const built = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ["es"], fileName: fixture, cssFileName: fixture },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
    plugins: [{
      name: "verify-isolated-chart-entry",
      transform(_code, id) {
        resolved.add(id);
        return null;
      },
      generateBundle(_options, bundle) {
        retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.keys(output.modules) : []);
      },
    }],
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
  const javascript = outputs.filter(output => output.type === "chunk").map(output => output.code).join("\n").replace(/^\/\/#(?:end)?region.*$/gmu, "");
  const css = outputs.flatMap(output => output.type === "asset" && output.fileName.endsWith(".css") ? [String(output.source)] : []).join("\n");
  assert.ok([...resolved].some(id => id.startsWith(charts) && id.endsWith(`/dist/${expectedModule}.js`)), `${fixture} must resolve the copied built ${expectedModule}`);
  if (engine === "uplot") {
    assert.ok(retained.some(id => /(?:^|\/)uplot(?:\/|$)/u.test(id)), `${fixture} must retain uPlot`);
    assert.ok(!retained.some(id => /d3-(?:scale|shape)/u.test(id)), `${fixture} must not retain the SVG chart engine`);
  } else if (engine === "d3") {
    assert.ok(retained.some(id => /d3-scale/u.test(id)), `${fixture} must retain d3-scale`);
    assert.ok(retained.some(id => /d3-shape/u.test(id)), `${fixture} must retain d3-shape`);
    assert.ok(!retained.some(id => /(?:^|\/)uplot(?:\/|$)/u.test(id)), `${fixture} must not retain uPlot`);
  } else assert.ok(!retained.some(id => /(?:uplot|d3-(?:scale|shape))/.test(id)), `${fixture} must not retain a chart engine`);
  assert.ok(!retained.some(id => id.startsWith(charts) && id.includes("/src/") && !id.endsWith("/src/styles.css")), `${fixture} must not retain chart source TypeScript`);
  const bytes = gzipBytes(includeCss ? Buffer.from(`${javascript}\n${css}`) : javascript);
  if (process.argv.includes("--report-bundles")) process.stdout.write(`${fixture} output:\n${javascript}\n`);
  assert.ok(bytes < maximum, `${fixture} is ${bytes} gzip bytes, budget is <${maximum}`);
  process.stdout.write(`${fixture} bundle budget passed: ${bytes}B gzip (<${maximum}B${includeCss ? ", including CSS" : ""})\n`);
}

async function assertCodeRendererBudget(temporary: string, codePackage: string): Promise<void> {
  const entry = join(temporary, "code-renderer.mjs");
  await cp(new URL("tests/consumers/code-renderer.mjs", root), entry);
  let retained: readonly string[] = [];
  const built = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ["es"], fileName: "code-renderer" },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
    plugins: [{
      name: "verify-code-renderer-isolation",
      generateBundle(_options, bundle) {
        retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.keys(output.modules) : []);
      },
    }],
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
  const javascript = outputs.filter(output => output.type === "chunk").map(output => output.code).join("\n");
  const bytes = gzipBytes(javascript);
  assert.ok(retained.some(id => id.startsWith(codePackage) && id.endsWith("/dist/CodeBlock.js")), "Code consumer must retain the copied renderer");
  assert.ok(!retained.some(id => /(?:^|\/)shiki(?:\/|$)|@shikijs|oniguruma/.test(id)), "CodeBlock renderer must not retain Shiki or its engines");
  assert.ok(bytes < 5_000, `CodeBlock renderer is ${bytes} gzip bytes, budget is <5000`);
  process.stdout.write(`Isolated CodeBlock renderer budget passed: ${bytes}B gzip, without Shiki\n`);
}

async function assertAdvancedViewerBudget(temporary: string, codePackage: string, fixture: "code-diff-viewer" | "code-log-viewer" | "code-json-viewer", expectedModule: "DiffViewer" | "LogViewer" | "JSONViewer"): Promise<void> {
  const entry = join(temporary, `${fixture}.mjs`);
  await cp(new URL(`tests/consumers/${fixture}.mjs`, root), entry);
  let retained: readonly string[] = [];
  const built = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ["es"], fileName: fixture, cssFileName: fixture },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
    plugins: [{
      name: `verify-${fixture}-isolation`,
      generateBundle(_options, bundle) {
        retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.entries(output.modules)
          .filter(([, details]) => details.renderedLength > 0).map(([id]) => id) : []);
      },
    }],
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
  const javascript = outputs.filter(output => output.type === "chunk").map(output => output.code).join("\n");
  const css = outputs.flatMap(output => output.type === "asset" && output.fileName.endsWith(".css") ? [String(output.source)] : []).join("\n");
  const bytes = gzipBytes(Buffer.from(`${javascript}\n${css}`));
  assert.ok(retained.some(id => id.startsWith(codePackage) && id.endsWith(`/dist/${expectedModule}.js`)), `${fixture} must retain its dedicated built entry`);
  assert.ok(!retained.some(id => /(?:^|\/)shiki(?:\/|$)|@shikijs|oniguruma|\/dist\/CodeBlock\.js|@gemologic\/sheen-(?:table|date|charts)/u.test(id)), `${fixture} must not retain highlighting, CodeBlock, table, date, or chart engines`);
  assert.ok(bytes < 20_000, `${fixture} is ${bytes} gzip bytes, budget is <20000; retained modules:\n${retained.slice(0, 40).join("\n")}`);
  process.stdout.write(`${fixture} isolated bundle passed: ${bytes}B gzip (<20000B)\n`);
}

async function assertDateBundleBudget(temporary: string, datePackage: string, fixture: "date-core" | "date-field" | "date-picker" | "date-time-picker", expectedModule: string, maximum: number): Promise<void> {
  const entry = join(temporary, `${fixture}.mjs`);
  await cp(new URL(`tests/consumers/${fixture}.mjs`, root), entry);
  let retained: readonly string[] = [];
  const built = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ["es"], fileName: fixture },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
    plugins: [{
      name: `verify-${fixture}-isolation`,
      generateBundle(_options, bundle) {
        retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.entries(output.modules)
          .filter(([, details]) => details.renderedLength > 0).map(([id]) => id) : []);
      },
    }],
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
  const javascript = outputs.filter(output => output.type === "chunk").map(output => output.code).join("\n");
  const bytes = gzipBytes(javascript);
  assert.ok(retained.some(id => id.startsWith(datePackage) && id.endsWith(`/dist/${expectedModule}.js`)), `${fixture} must retain the copied built ${expectedModule}`);
  assert.ok(!retained.some(id => id.startsWith(datePackage) && id.includes("/src/") && !id.endsWith("/src/styles.css")), `${fixture} must not retain date source TypeScript`);
  if (fixture === "date-core") {
    assert.ok(!retained.some(id => /(?:solid-js|@ark-ui|@gemologic\/sheen\/dist)/u.test(id)), "Date core must not retain Solid, Ark UI, or the Sheen UI runtime");
  }
  assert.ok(bytes < maximum, `${fixture} is ${bytes} gzip bytes, budget is <${maximum}; retained modules:\n${retained.slice(0, 40).join("\n")}`);
  process.stdout.write(`${fixture} bundle budget passed: ${bytes}B gzip (<${maximum}B)\n`);
}

async function assertQueryBuilderBundle(temporary: string, tablePackage: string): Promise<void> {
  const entry = join(temporary, "table-query-builder.mjs");
  await cp(new URL("tests/consumers/table-query-builder.mjs", root), entry);
  let retained: readonly string[] = [];
  const built = await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: true,
      lib: { entry, formats: ["es"], fileName: "table-query-builder", cssFileName: "table-query-builder" },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
    plugins: [{
      name: "verify-query-builder-isolation",
      generateBundle(_options, bundle) {
        retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.entries(output.modules)
          .filter(([, details]) => details.renderedLength > 0).map(([id]) => id) : []);
      },
    }],
  });
  const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
  const javascript = outputs.filter(output => output.type === "chunk").map(output => output.code).join("\n");
  const css = outputs.flatMap(output => output.type === "asset" && output.fileName.endsWith(".css") ? [String(output.source)] : []).join("\n");
  const bytes = gzipBytes(Buffer.from(`${javascript}\n${css}`));
  assert.ok(retained.some(id => id.startsWith(tablePackage) && id.endsWith("/dist/QueryBuilder.js")), "QueryBuilder consumer must retain its dedicated built entry");
  assert.ok(!retained.some(id => id.startsWith(tablePackage) && id.endsWith("/dist/DataTable.js")), "QueryBuilder entry must not retain DataTable");
  assert.ok(!retained.some(id => /@tanstack\/solid-virtual|@gemologic\/sheen-(?:date|charts)|@atlaskit\/pragmatic-drag-and-drop/u.test(id)), "QueryBuilder entry must not retain virtual, date, chart, or Composer drag engines");
  assert.ok(bytes < 55_000, `QueryBuilder entry is ${bytes} gzip bytes, budget is <55000; retained modules:\n${retained.slice(0, 40).join("\n")}`);
  process.stdout.write(`Isolated QueryBuilder entry passed: ${bytes}B gzip (<55000B)\n`);
}

async function assertNoDateDependencyTypes(directory: string): Promise<void> {
  const publicModules = ["index", "core", "types", "calendar-date", "time", "time-zone", "date-time", "date-range", "format", "Calendar", "DateField", "DatePicker", "TimeField", "TimePicker", "TimeZoneSelect", "DateTimePicker", "table-filter"];
  for (const module of publicModules) {
    const path = join(directory, `${module}.d.ts`);
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /@ark-ui|@internationalized\/date/u, `${path} leaks a date implementation dependency`);
  }
}

try {
  const installed = join(temporary, "node_modules", "@gemologic", "sheen-tokens");
  await mkdir(installed, { recursive: true });
  await cp(new URL("packages/tokens/package.json", root), join(installed, "package.json"));
  await cp(new URL("packages/tokens/dist", root), join(installed, "dist"), { recursive: true });
  await assertTokenCssBudgets(installed);
  const table = join(temporary, "node_modules", "@gemologic", "sheen-table");
  await mkdir(table, { recursive: true });
  await cp(new URL("packages/table/package.json", root), join(table, "package.json"));
  await cp(new URL("packages/table/dist", root), join(table, "dist"), { recursive: true });
  await cp(new URL("packages/table/src", root), join(table, "src"), { recursive: true });
  const charts = join(temporary, "node_modules", "@gemologic", "sheen-charts");
  await mkdir(charts, { recursive: true });
  await cp(new URL("packages/charts/package.json", root), join(charts, "package.json"));
  await cp(new URL("packages/charts/dist", root), join(charts, "dist"), { recursive: true });
  await mkdir(join(charts, "src"), { recursive: true });
  await cp(new URL("packages/charts/src/styles.css", root), join(charts, "src", "styles.css"));
  const uplot = join(temporary, "node_modules", "uplot");
  await symlink(await realpath(new URL("packages/charts/node_modules/uplot", root)), uplot, "dir");
  for (const dependency of ["d3-scale", "d3-shape"]) {
    const target = join(temporary, "node_modules", dependency);
    await symlink(await realpath(new URL(`packages/charts/node_modules/${dependency}`, root)), target, "dir");
  }
  const ui = join(temporary, "node_modules", "@gemologic", "sheen");
  await mkdir(join(ui, "src"), { recursive: true });
  await cp(new URL("packages/ui/package.json", root), join(ui, "package.json"));
  await cp(new URL("packages/ui/dist", root), join(ui, "dist"), { recursive: true });
  // CSS is the only source file exposed by the first built-JS fixture. Accidental TSX resolution must fail.
  await cp(new URL("packages/ui/src/styles.css", root), join(ui, "src", "styles.css"));
  for (const dependency of ["solid-js", "@kobalte/core", "@corvu/resizable", "cmdk-solid", "clsx"]) {
    const target = join(temporary, "node_modules", dependency);
    await mkdir(join(target, ".."), { recursive: true });
    await symlink(await realpath(new URL(`packages/ui/node_modules/${dependency}`, root)), target, "dir");
  }
  for (const dependency of ["@tanstack/solid-virtual"]) {
    const target = join(temporary, "node_modules", dependency);
    await mkdir(join(target, ".."), { recursive: true });
    await symlink(await realpath(new URL(`packages/table/node_modules/${dependency}`, root)), target, "dir");
  }
  const codePackage = join(temporary, "node_modules", "@gemologic", "sheen-code");
  await mkdir(join(codePackage, "src"), { recursive: true });
  await cp(new URL("packages/code/package.json", root), join(codePackage, "package.json"));
  await cp(new URL("packages/code/dist", root), join(codePackage, "dist"), { recursive: true });
  await cp(new URL("packages/code/src/styles.css", root), join(codePackage, "src", "styles.css"));
  await assertCodeRendererBudget(temporary, codePackage);
  await assertAdvancedViewerBudget(temporary, codePackage, "code-diff-viewer", "DiffViewer");
  await assertAdvancedViewerBudget(temporary, codePackage, "code-log-viewer", "LogViewer");
  await assertAdvancedViewerBudget(temporary, codePackage, "code-json-viewer", "JSONViewer");
  const datePackage = join(temporary, "node_modules", "@gemologic", "sheen-date");
  await mkdir(join(datePackage, "src"), { recursive: true });
  await cp(new URL("packages/date/package.json", root), join(datePackage, "package.json"));
  await cp(new URL("packages/date/dist", root), join(datePackage, "dist"), { recursive: true });
  await cp(new URL("packages/date/src/styles.css", root), join(datePackage, "src", "styles.css"));
  for (const dependency of ["@ark-ui/solid", "@internationalized/date"]) {
    const target = join(temporary, "node_modules", dependency);
    await mkdir(join(target, ".."), { recursive: true });
    await symlink(await realpath(new URL(`packages/date/node_modules/${dependency}`, root)), target, "dir");
  }
  await assertNoDateDependencyTypes(join(datePackage, "dist"));
  await assertDateBundleBudget(temporary, datePackage, "date-core", "date-time", 6_200);
  await assertDateBundleBudget(temporary, datePackage, "date-field", "DateField", 34_000);
  await assertDateBundleBudget(temporary, datePackage, "date-picker", "DatePicker", 61_000);
  await assertDateBundleBudget(temporary, datePackage, "date-time-picker", "DateTimePicker", 110_000);
  const compiler = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));
  for (const name of ["private-theme", "table-pagination", "chart-core"]) {
    const fixture = join(temporary, `${name}.mts`);
    await cp(new URL(`tests/consumers/${name}.mts`, root), fixture);
    await run(process.execPath, [compiler, "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2023", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--types", "node", "--typeRoots", fileURLToPath(new URL("node_modules/@types", root)), fixture], { cwd: temporary, timeout: 60_000 });
    const result = await run(process.execPath, [fixture], { cwd: temporary, timeout: 60_000 });
    process.stdout.write(result.stdout);
  }
  const dateTypes = join(temporary, "date-package.mts");
  await cp(new URL("tests/consumers/date-package.mts", root), dateTypes);
  await run(process.execPath, [compiler, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck", "--target", "ES2023", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--types", "node", "--typeRoots", fileURLToPath(new URL("node_modules/@types", root)), dateTypes], { cwd: temporary, timeout: 60_000 });
  const dateResult = await run(process.execPath, [dateTypes], { cwd: temporary, timeout: 60_000 });
  process.stdout.write(dateResult.stdout);
  const chartTypes = join(temporary, "chart-package.mts");
  await cp(new URL("tests/consumers/chart-package.mts", root), chartTypes);
  await run(process.execPath, [compiler, "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2023", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--types", "node", "--typeRoots", fileURLToPath(new URL("node_modules/@types", root)), chartTypes], { cwd: temporary, timeout: 60_000 });
  const chartEntry = join(temporary, "chart-package.mjs");
  await cp(new URL("tests/consumers/chart-package.mjs", root), chartEntry);
  let verifiedCharts = false;
  await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    resolve: { conditions: ["browser", "module", "production"] },
    build: {
      write: false,
      minify: false,
      lib: { entry: chartEntry, formats: ["es"], fileName: "chart-package" },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
    },
    plugins: [{
      name: "verify-installed-chart-entries",
      generateBundle(_options, bundle) {
        const chunks = Object.values(bundle).filter(output => output.type === "chunk");
        assert.ok(chunks.some(chunk => chunk.exports.includes("useThemeTokens") && chunk.exports.includes("invalidateThemeTokens")), "Chart consumer must retain both public exports");
        const retained = chunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, module]) => module.renderedLength > 0).map(([id]) => id));
        assert.ok(retained.some(id => id.startsWith(charts) && id.endsWith("/dist/theme-tokens.js")), "Consumer must use the copied built token bridge");
        assert.ok(!retained.some(id => id.startsWith(charts) && id.includes("/src/")), "Built chart consumer must not retain chart source TypeScript");
        assert.ok(!retained.some(id => /(?:^|\/)uplot(?:\/|$)/u.test(id)), "Tree-shaken chart root hooks must not retain uPlot");
        verifiedCharts = true;
      },
    }],
  });
  assert.ok(verifiedCharts, "Chart package verification must run");
  process.stdout.write("Isolated built chart hook and Loupe invalidation entries passed\n");
  await assertChartBundleBudget(temporary, charts, "chart-sparkline", "Sparkline", 1_000, false);
  await assertChartBundleBudget(temporary, charts, "chart-svg", "Sparkline", 20_000, true);
  await assertChartBundleBudget(temporary, charts, "chart-table", "ChartDataTable", 20_000, true);
  await assertChartBundleBudget(temporary, charts, "chart-time-series", "TimeSeries", 60_000, true, "uplot");
  await assertChartBundleBudget(temporary, charts, "chart-charts-svg", "charts-svg", 35_000, true, "d3");
  await assertChartBundleBudget(temporary, charts, "chart-streaming", "streaming", 6_000, false);
  const dataTableTypes = join(temporary, "table-datatable-types.mts");
  await cp(new URL("tests/consumers/table-datatable-types.mts", root), dataTableTypes);
  await run(process.execPath, [compiler, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck", "--target", "ES2023", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--types", "node", "--typeRoots", fileURLToPath(new URL("node_modules/@types", root)), dataTableTypes], { cwd: temporary, timeout: 60_000 });
  process.stdout.write("Isolated DataTable ownership types passed\n");
  await assertQueryBuilderBundle(temporary, table);

  await assertUiBundleBudget(temporary, "ui-single", 5_000);
  await assertUiBundleBudget(temporary, "ui-core-full", 32_000);
  await assertUiBundleBudget(temporary, "ui-forms-full", 60_000);
  await assertUiBundleBudget(temporary, "ui-overlays-full", 55_000);
  await assertUiBundleBudget(temporary, "ui-navigation-full", 58_000);
  await assertUiBundleBudget(temporary, "ui-representative", 55_000);
  await assertUiBundleBudget(temporary, "ui-full");
  const uiFeatureTypes = join(temporary, "ui-feature-package.mts");
  await cp(new URL("tests/consumers/ui-feature-package.mts", root), uiFeatureTypes);
  await run(process.execPath, [compiler, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck", "--target", "ES2023", "--module", "ESNext", "--moduleResolution", "Bundler", "--types", "node", "--typeRoots", fileURLToPath(new URL("node_modules/@types", root)), uiFeatureTypes], { cwd: temporary, timeout: 60_000 });
  process.stdout.write("Isolated UI feature-entry types passed\n");
  const uiTypes = join(temporary, "ui-package.mts");
  await cp(new URL("tests/consumers/ui-package.mts", root), uiTypes);
  await run(process.execPath, [compiler, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck", "--target", "ES2023", "--module", "ESNext", "--moduleResolution", "Bundler", "--types", "node", "--typeRoots", fileURLToPath(new URL("node_modules/@types", root)), uiTypes], { cwd: temporary, timeout: 60_000 });
  const uiEntry = join(temporary, "ui-package.mjs");
  await cp(new URL("tests/consumers/ui-package.mjs", root), uiEntry);
  for (const entryCondition of ["built", "solid"]) {
    if (entryCondition === "solid") await cp(new URL("packages/ui/src", root), join(ui, "src"), { recursive: true });
    let verified = false;
    const built = await build({
      configFile: false,
      root: temporary,
      logLevel: "warn",
      resolve: { conditions: ["browser", "module", "production"] },
      build: {
        write: false,
        minify: false,
        lib: { entry: uiEntry, formats: ["es"], fileName: "ui-consumer", cssFileName: "ui-consumer" },
        rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
      },
      plugins: [entryCondition === "solid" ? solid() : undefined, {
        name: "verify-installed-ui-entry",
        generateBundle(_options, bundle) {
          const chunks = Object.values(bundle).filter(output => output.type === "chunk");
          assert.ok(chunks.some(chunk => chunk.exports.includes("Button") && chunk.exports.includes("Link")), "Consumer must retain its public component exports");
          const retained = chunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, module]) => module.renderedLength > 0).map(([id]) => id));
          for (const component of ["Button", "Link"]) {
            const suffix = entryCondition === "solid" ? `/src/primitives/${component}.tsx` : `/dist/primitives/${component}.js`;
            assert.ok(retained.some(id => id.startsWith(ui) && id.endsWith(suffix)), `${entryCondition} consumer must use its copied ${component} entry`);
          }
          assert.ok(!retained.some(id => /@kobalte|@tanstack|uplot/.test(id)), "Native Button/Link consumer must not retain headless/chart/table modules");
          if (entryCondition === "built") assert.ok(!retained.some(id => /\/src\/.*\.tsx/.test(id)), "Built consumer must not retain source TSX");
          else assert.ok(!retained.some(id => id.startsWith(ui) && id.includes("/dist/")), "Solid consumer must not mix compiled UI entries into its source graph");
          verified = true;
        },
      }],
    });
    assert.ok(verified, "Consumer bundle verification must run");
    const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
    const css = outputs.filter(output => output.type === "asset" && output.fileName.endsWith(".css"));
    assert.ok(css.length > 0, "Public CSS entry points must produce a stylesheet");
    assert.ok(css.some(asset => asset.type === "asset" && String(asset.source).includes("sheen-button")), "Consumer CSS must retain component rules");
    process.stdout.write(`Isolated ${entryCondition} UI exports, CSS entries, and native component tree shaking passed (Solid peer external)\n`);
    if (process.argv.includes("--browser")) await checkConsumerBrowser(temporary, ui, entryCondition);
  }
  const tableEntry = join(temporary, "table-datatable.mjs");
  await cp(new URL("tests/consumers/table-datatable.mjs", root), tableEntry);
  for (const entryCondition of ["built", "solid"]) {
    let verified = false;
    const built = await build({
      configFile: false,
      root: temporary,
      logLevel: "warn",
      build: {
        write: false,
        minify: false,
        lib: { entry: tableEntry, formats: ["es"], fileName: "table-datatable", cssFileName: "table-datatable" },
        rolldownOptions: { external: [/^solid-js(?:\/|$)/] },
      },
      plugins: [entryCondition === "solid" ? solid() : undefined, {
        name: "verify-installed-data-table-entry",
        generateBundle(_options, bundle) {
          const chunks = Object.values(bundle).filter(output => output.type === "chunk");
          assert.ok(chunks.some(chunk => chunk.exports.includes("ConsumerDataTable")), "Consumer must retain its DataTable wrapper");
          const retained = chunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, module]) => module.renderedLength > 0).map(([id]) => id));
          const suffix = entryCondition === "solid" ? "/src/DataTable.tsx" : "/dist/DataTable.js";
          assert.ok(retained.some(id => id.startsWith(table) && id.endsWith(suffix)), `${entryCondition} consumer must use its copied DataTable entry`);
          assert.ok(!retained.some(id => id.includes("@tanstack/solid-table")), `${entryCondition} DataTable consumer must not retain the rejected full row-model engine`);
          assert.ok(!retained.some(id => /@gemologic\/sheen-date|@ark-ui|@internationalized\/date/u.test(id)), `${entryCondition} DataTable consumer must not retain the optional date editor implementation`);
          if (entryCondition === "built") assert.ok(!retained.some(id => id.startsWith(table) && /\/src\/.*\.tsx?$/.test(id)), "Built DataTable consumer must not retain table source TypeScript");
          else assert.ok(!retained.some(id => id.startsWith(table) && id.includes("/dist/")), "Solid DataTable consumer must not mix compiled table entries into its source graph");
          verified = true;
        },
      }],
    });
    assert.ok(verified, "DataTable consumer bundle verification must run");
    const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
    const css = outputs.filter(output => output.type === "asset" && output.fileName.endsWith(".css"));
    assert.ok(css.some(asset => asset.type === "asset" && String(asset.source).includes("sheen-data-table")), "Installed DataTable styles must produce component CSS");
    process.stdout.write(`Isolated ${entryCondition} DataTable entry and styles passed\n`);
  }
  const patterns = join(temporary, "node_modules", "@gemologic", "sheen-patterns");
  await mkdir(patterns, { recursive: true });
  await cp(new URL("packages/patterns/package.json", root), join(patterns, "package.json"));
  await cp(new URL("packages/patterns/dist", root), join(patterns, "dist"), { recursive: true });
  const patternFixtureNames: readonly string[] = ["patterns-base-appshell", "patterns-auth", "patterns-admin"];
  for (const fixtureName of patternFixtureNames) {
    const fixture = join(temporary, `${fixtureName}.mjs`);
    await cp(new URL(`tests/consumers/${fixtureName}.mjs`, root), fixture);
    const resolved = new Set<string>();
    let retained: readonly string[] = [];
    const built = await build({
      configFile: false,
      root: temporary,
      logLevel: "warn",
      resolve: { conditions: ["browser", "module", "production"] },
      build: {
        write: false,
        minify: true,
        lib: { entry: fixture, formats: ["es"], fileName: fixtureName },
        rolldownOptions: { external: [/^solid-js(?:\/|$)/, /^@solidjs\/meta(?:\/|$)/] },
      },
      plugins: [{
        name: `verify-${fixtureName}-isolation`,
        transform(_code, id) {
          resolved.add(id);
          return null;
        },
        generateBundle(_options, bundle) {
          retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.entries(output.modules)
            .filter(([, details]) => details.renderedLength > 0).map(([id]) => id) : []);
        },
      }],
    });
    const outputs = (Array.isArray(built) ? built : [built]).flatMap(result => "output" in result ? result.output : []);
    const javascript = outputs.filter(output => output.type === "chunk").map(output => output.code).join("\n");
    const bytes = gzipBytes(javascript);
    assert.ok(!retained.some(id => /@gemologic\/sheen-(?:table|charts|date)|@atlaskit\/pragmatic-drag-and-drop|(?:^|\/)Composer(?:\.|\/)/u.test(id)), `${fixtureName} must not retain table, chart, date, Composer, or its drag engine`);
    if (fixtureName === "patterns-admin") {
      assert.ok([...resolved].some(id => id.startsWith(patterns) && id.endsWith("/dist/admin.js")), "Admin consumer must resolve the dedicated built entry");
      assert.ok(retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/AdminApp.js")), "Admin consumer must retain AdminApp composition");
      assert.ok(!retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/index.js")), "Admin entry must not pull the base patterns barrel");
      assert.ok(bytes < 80_000, `Admin application entry is ${bytes} gzip bytes, budget is <80000; retained modules:\n${retained.slice(0, 30).join("\n")}`);
    } else if (fixtureName === "patterns-auth") {
      assert.ok([...resolved].some(id => id.startsWith(patterns) && id.endsWith("/dist/auth.js")), "Auth consumer must resolve the dedicated built entry");
      assert.ok(retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/AuthLayout.js")), "Auth consumer must retain the authentication layouts");
      assert.ok(!retained.some(id => id.startsWith(patterns) && /\/dist\/(?:index|AppShell|AdminApp|AccountMenu|WorkspaceSwitcher|NotificationCenter|DetailsPanel|admin-config)\.js$/u.test(id)), "Auth entry must not retain shell or AdminApp modules");
      assert.ok(bytes < 15_000, `Authentication layout entry is ${bytes} gzip bytes, budget is <15000; retained modules:\n${retained.slice(0, 30).join("\n")}`);
    } else {
      assert.ok(retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/AppShell.js")), "Base consumer must retain AppShell");
      assert.ok(!retained.some(id => id.startsWith(patterns) && /\/(?:AdminApp|AccountMenu|WorkspaceSwitcher|NotificationCenter|DetailsPanel|admin-config)\.js$/u.test(id)), "Base AppShell must not retain AdminApp modules");
      assert.ok(!retained.some(id => /\/dist\/primitives\/(?:CommandPalette|Toaster)\.js$/u.test(id)), "Base AppShell must not retain AdminApp palette or toast services");
    }
    process.stdout.write(`${fixtureName} isolation passed: ${bytes}B gzip\n`);
  }
  const routerFixture = join(temporary, "patterns-router.mjs");
  await cp(new URL("tests/consumers/patterns-router.mjs", root), routerFixture);
  let verifiedRouter = false;
  await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    build: {
      write: false,
      minify: false,
      lib: { entry: routerFixture, formats: ["es"], fileName: "patterns-router" },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/, /^@solidjs\/router(?:\/|$)/] },
    },
    plugins: [{
      name: "verify-installed-solid-router-adapter",
      generateBundle(_options, bundle) {
        const chunks = Object.values(bundle).filter(output => output.type === "chunk");
        assert.ok(chunks.some(chunk => chunk.exports.includes("useSolidRouterAdapter")), "Solid router consumer must retain the public adapter export");
        const retained = chunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, module]) => module.renderedLength > 0).map(([id]) => id));
        assert.ok(retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/solid-router.js")), "Consumer must resolve the copied dedicated adapter entry");
        assert.ok(!retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/index.js")), "Dedicated adapter must not pull the root patterns entry");
        verifiedRouter = true;
      },
    }],
  });
  assert.ok(verifiedRouter, "Solid router package verification must run");
  process.stdout.write("Isolated Solid router adapter entry passed without retaining the patterns root\n");
  const tanstackRouterFixture = join(temporary, "patterns-tanstack-router.mjs");
  await cp(new URL("tests/consumers/patterns-tanstack-router.mjs", root), tanstackRouterFixture);
  let verifiedTanStackRouter = false;
  await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    build: {
      write: false,
      minify: false,
      lib: { entry: tanstackRouterFixture, formats: ["es"], fileName: "patterns-tanstack-router" },
      rolldownOptions: { external: [/^solid-js(?:\/|$)/, /^@tanstack\/solid-router(?:\/|$)/] },
    },
    plugins: [{
      name: "verify-installed-tanstack-router-adapter",
      generateBundle(_options, bundle) {
        const chunks = Object.values(bundle).filter(output => output.type === "chunk");
        assert.ok(chunks.some(chunk => chunk.exports.includes("createTanStackRouterAdapter") && chunk.exports.includes("useTanStackRouterAdapter")), "TanStack router consumer must retain both public adapter exports");
        const retained = chunks.flatMap(chunk => Object.entries(chunk.modules).filter(([, module]) => module.renderedLength > 0).map(([id]) => id));
        assert.ok(retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/tanstack-router.js")), "Consumer must resolve the copied dedicated TanStack adapter entry");
        assert.ok(!retained.some(id => id.startsWith(patterns) && id.endsWith("/dist/index.js")), "Dedicated TanStack adapter must not pull the patterns root");
        verifiedTanStackRouter = true;
      },
    }],
  });
  assert.ok(verifiedTanStackRouter, "TanStack router package verification must run");
  process.stdout.write("Isolated TanStack router adapter entry passed without retaining the patterns root\n");
  const ssrEntry = join(temporary, "ui-ssr.mjs");
  await cp(new URL("tests/consumers/ui-ssr.mjs", root), ssrEntry);
  let verifiedSsr = false;
  await build({
    configFile: false,
    root: temporary,
    logLevel: "warn",
    ssr: { noExternal: ["@gemologic/sheen"] },
    build: {
      ssr: ssrEntry,
      outDir: join(temporary, "ssr"),
      minify: false,
      rolldownOptions: { output: { entryFileNames: "ui-ssr.mjs" } },
    },
    plugins: [solid({ ssr: true }), {
      name: "verify-installed-ssr-entry",
      generateBundle(_options, bundle) {
        const retained = Object.values(bundle).flatMap(output => output.type === "chunk" ? Object.keys(output.modules) : []);
        assert.ok(retained.some(id => id.startsWith(ui) && id.endsWith("/src/primitives/Button.tsx")), "SSR must compile the copied source Button");
        assert.ok(retained.some(id => id.startsWith(ui) && id.endsWith("/src/primitives/Link.tsx")), "SSR must compile the copied source Link");
        verifiedSsr = true;
      },
    }],
  });
  assert.ok(verifiedSsr, "SSR source entry verification must run");
  const ssrResult = await run(process.execPath, [join(temporary, "ssr", "ui-ssr.mjs")], { cwd: temporary, timeout: 60_000 });
  process.stdout.write(ssrResult.stdout);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
