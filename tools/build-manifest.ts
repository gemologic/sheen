import { access, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Node, Project } from "ts-morph";
import { isComponentMetadata } from "../packages/ui/src/metadata.ts";
import { componentExports, exampleModule, inspectProps } from "./metadata.ts";
import { writeLoupeDocs } from "./loupe-docs.ts";
import type { LoupeDocSource } from "./loupe-docs.ts";
import { composerCatalog } from "../apps/loupe/src/composer/catalog.ts";
import { composerComponentRules } from "../apps/loupe/src/composer/model.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const project = new Project({ tsConfigFilePath: join(root, "tsconfig.json"), compilerOptions: { noEmit: true } });
const errors: string[] = [];
const components = [];
const loupeSources: LoupeDocSource[] = [];
const consumedMetadata = new Set<string>();
let exampleCount = 0;

interface PublicEntry { readonly path: string; readonly specifier: string }

function packageEntries(packageRoot: string, packageName: string, manifest: object): readonly PublicEntry[] {
  const rootEntry = join(packageRoot, "src", "index.ts");
  const result = new Map<string, string>();
  if (!("exports" in manifest) || typeof manifest.exports !== "object" || manifest.exports === null) return [{ path: rootEntry, specifier: packageName }];
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (typeof target !== "object" || target === null || !("solid" in target) || typeof target.solid !== "string") continue;
    if (!target.solid.startsWith("./src/") || target.solid.includes("*") || !/\.[cm]?tsx?$/u.test(target.solid)) continue;
    const specifier = subpath === "." ? packageName : `${packageName}/${subpath.replace(/^\.\//u, "")}`;
    result.set(join(packageRoot, target.solid), specifier);
  }
  result.delete(rootEntry);
  return [{ path: rootEntry, specifier: packageName }, ...[...result].sort(([left], [right]) => left.localeCompare(right)).map(([path, specifier]) => ({ path, specifier }))];
}

for (const directory of await readdir(join(root, "packages"), { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const packageRoot = join(root, "packages", directory.name);
  const raw: unknown = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  if (typeof raw !== "object" || raw === null || !("name" in raw) || typeof raw.name !== "string") throw new Error(`Invalid package manifest: ${packageRoot}`);
  const seenComponents = new Set<string>();
  for (const publicEntry of packageEntries(packageRoot, raw.name, raw)) {
    const entryPath = publicEntry.path;
    const entry = project.getSourceFile(entryPath);
    if (!entry) { errors.push(`${relative(root, entryPath)}: public solid entry is missing from the TypeScript project`); continue; }
    const exported = componentExports(entry);
    const runtimeExports = [...entry.getExportedDeclarations()].filter(([, declarations]) => declarations.some(declaration =>
      Node.isFunctionDeclaration(declaration) || Node.isVariableDeclaration(declaration) || Node.isClassDeclaration(declaration) || Node.isEnumDeclaration(declaration)
    )).map(([name]) => name);
    const imports = `import { ${runtimeExports.join(", ")} } from ${JSON.stringify(entryPath)};`;
    for (const component of exported) {
      if (seenComponents.has(component.name)) continue;
      seenComponents.add(component.name);
      const source = component.declaration.getSourceFile().getFilePath();
      const metaPath = join(dirname(source), `${component.name}.meta.ts`);
      const demoPath = join(dirname(source), `${component.name}.demo.tsx`);
      try { await access(metaPath); }
      catch { errors.push(`${component.name}: missing ${relative(root, metaPath)}`); continue; }
      consumedMetadata.add(metaPath);
      try { await access(demoPath); }
      catch { errors.push(`${component.name}: missing ${relative(root, demoPath)}`); }
      const demo = project.getSourceFile(demoPath);
      if (demo && (!demo.getDefaultExportSymbol() || !demo.getExportedDeclarations().has("controls"))) errors.push(`${component.name}: demo must export its renderer and controls schema`);
      const loaded: unknown = (await import(pathToFileURL(metaPath).href)).default;
      if (!isComponentMetadata(loaded)) { errors.push(`${component.name}: invalid metadata or no compiling example candidate`); continue; }
      if (loaded.package !== raw.name) errors.push(`${component.name}: metadata package ${loaded.package} differs from ${raw.name}`);
      const inspected = inspectProps(component, loaded);
      errors.push(...inspected.errors);
      if (loaded.composer) {
        for (const name of loaded.composer.editableSafeProps) {
          if (!inspected.props[name]) errors.push(`${component.name}: Composer editable safe prop ${JSON.stringify(name)} is not in the public props contract`);
        }
        const duplicateParents = loaded.composer.allowedParentRegions.filter((name, index, values) => values.indexOf(name) !== index);
        const duplicateChildren = loaded.composer.acceptedChildRegions.filter((name, index, values) => values.indexOf(name) !== index);
        const duplicateProps = loaded.composer.editableSafeProps.filter((name, index, values) => values.indexOf(name) !== index);
        if (duplicateParents.length) errors.push(`${component.name}: duplicate Composer parent regions: ${duplicateParents.join(", ")}`);
        if (duplicateChildren.length) errors.push(`${component.name}: duplicate Composer child regions: ${duplicateChildren.join(", ")}`);
        if (duplicateProps.length) errors.push(`${component.name}: duplicate Composer editable props: ${duplicateProps.join(", ")}`);
      }
      project.createSourceFile(join(packageRoot, "src", "__examples__", `${component.name}.tsx`), exampleModule(component, loaded, imports), { overwrite: true });
      exampleCount += loaded.examples.length;
      components.push({ ...loaded, props: inspected.props, source: relative(root, source), demo: relative(root, demoPath) });
      loupeSources.push({ metadata: loaded, props: inspected.props, packageName: publicEntry.specifier, runtimeExports, source: relative(root, source) });
    }
  }
}
for (const source of project.getSourceFiles()) {
  const path = source.getFilePath();
  if (path.startsWith(join(root, "packages") + "/") && path.endsWith(".meta.ts") && !consumedMetadata.has(path)) errors.push(`${relative(root, path)}: metadata has no matching exported component`);
}
const composerComponents = new Map<string, (typeof composerCatalog)[number]>(composerCatalog.map(entry => [entry.component, entry]));
for (const entry of composerCatalog) {
  const metadata = components.find(component => component.name === entry.component);
  if (!metadata?.composer) {
    errors.push(`${entry.component}: Composer catalog components require complete metadata`);
    continue;
  }
  const rule = composerComponentRules[entry.component];
  const parents = [...metadata.composer.allowedParentRegions].sort().join(",");
  const ruleParents = [...rule.regions].sort().join(",");
  if (parents !== ruleParents) errors.push(`${entry.component}: Composer metadata parent regions differ from the validated layout rule`);
  const safeProps = [...metadata.composer.editableSafeProps].sort().join(",");
  const ruleProps = Object.keys(rule.props).sort().join(",");
  if (safeProps !== ruleProps) errors.push(`${entry.component}: Composer metadata safe props differ from the validated layout rule`);
}
for (const component of components) {
  if (component.composer && component.name !== "AdminApp" && !composerComponents.has(component.name)) {
    errors.push(`${component.name}: Composer metadata requires a catalog, renderer, and generator adapter`);
  }
}
const diagnostics = project.getPreEmitDiagnostics();
if (diagnostics.length) errors.push(project.formatDiagnosticsWithColorAndContext(diagnostics));
if (errors.length) throw new Error(`Component metadata validation failed:\n${errors.join("\n")}`);
components.sort((a, b) => `${a.package}/${a.name}`.localeCompare(`${b.package}/${b.name}`));
await writeFile(join(root, "sheen.manifest.json"), JSON.stringify({ schemaVersion: 1, components }, null, 2) + "\n");
const tokenConsumers = new Map<string, Set<string>>();
for (const component of components) {
  for (const token of component.tokens) {
    const consumers = tokenConsumers.get(token) ?? new Set<string>();
    consumers.add(component.name);
    tokenConsumers.set(token, consumers);
  }
}
const tokenConsumerRecord = Object.fromEntries([...tokenConsumers.entries()]
  .sort(([first], [second]) => first.localeCompare(second))
  .map(([token, consumers]) => [token, [...consumers].sort((first, second) => first.localeCompare(second))]));
await writeFile(join(root, "apps/loupe/src/generated/token-consumers.ts"), [
  "// Generated by tools/build-manifest.ts. Do not edit by hand.",
  `export const tokenConsumers: Readonly<Record<string, readonly string[]>> = Object.freeze(${JSON.stringify(tokenConsumerRecord, null, 2)});`,
  "",
].join("\n"));
await writeLoupeDocs(loupeSources);
console.log(`Validated ${components.length} exported components, exhaustive props, and ${exampleCount} extracted examples`);
