import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ESLint } from "eslint";
import { Project, ScriptKind, SyntaxKind, ts } from "ts-morph";
import { parseEvalReports, parseEvalSuite } from "./agent-evals.ts";

interface ManifestComponent {
  readonly name: string;
  readonly package: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly role: string;
}

interface SheenImport {
  readonly package: string;
  readonly imported: string;
}

export interface EvalSourceAnalysis {
  readonly promptId: string;
  readonly generatedLines: number;
  readonly lintErrors: number;
  readonly interactiveElements: number;
  readonly sheenInteractiveElements: number;
  readonly hallucinatedProps: readonly string[];
  readonly typeErrors: readonly string[];
  readonly importErrors: readonly string[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function manifestComponents(value: unknown): readonly ManifestComponent[] {
  if (!record(value) || !Array.isArray(value.components)) throw new Error("Invalid Sheen manifest for agent eval source audit");
  const result: ManifestComponent[] = [];
  for (const entry of value.components) {
    if (!record(entry) || typeof entry.name !== "string" || typeof entry.package !== "string" || !record(entry.props)
      || !record(entry.a11y) || typeof entry.a11y.role !== "string") {
      throw new Error("Invalid Sheen manifest component for agent eval source audit");
    }
    result.push({ name: entry.name, package: entry.package, props: entry.props, role: entry.a11y.role });
  }
  return result;
}

function rawOutput(value: unknown): value is { readonly code: string; readonly notes: string } {
  return record(value)
    && Object.keys(value).length === 2
    && typeof value.code === "string"
    && value.code.trim().length > 0
    && typeof value.notes === "string";
}

function publicImport(specifier: string): boolean {
  return specifier === "solid-js"
    || specifier.startsWith("solid-js/")
    || specifier === "@gemologic/sheen"
    || specifier.startsWith("@gemologic/sheen-");
}

function componentForImport(components: readonly ManifestComponent[], item: SheenImport): ManifestComponent | undefined {
  return components.find(component => component.name === item.imported
    && (item.package === component.package || item.package.startsWith(`${component.package}/`)));
}

function interactiveRole(role: string): boolean {
  return /\b(actions?|button|calendar grid|checkbox|combobox|dialog|disclosure|grid|link|listbox|menu|navigation|radio|radiogroup|searchbox|separator|slider|spinbutton|switch|tab|tablist|textbox|tree|treegrid|treeitem)\b/iu.test(role);
}

function nativeInteractive(tag: string, attributes: readonly string[]): boolean {
  if (["button", "input", "select", "summary", "textarea"].includes(tag)) return true;
  return tag === "a" && attributes.includes("href");
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function diagnosticText(code: number, line: number | undefined, message: string): string {
  return `TS${code}${line === undefined ? "" : `:${line}`}: ${message}`;
}

export async function analyzeEvalSource(root: string, promptId: string, code: string): Promise<EvalSourceAnalysis> {
  const manifestValue: unknown = JSON.parse(await readFile(join(root, "sheen.manifest.json"), "utf8"));
  const components = manifestComponents(manifestValue);
  const project = new Project({ tsConfigFilePath: join(root, "apps", "loupe", "tsconfig.json"), skipAddingFilesFromTsConfig: true, compilerOptions: { noEmit: true } });
  const source = project.createSourceFile(join(root, "apps", "loupe", "src", "__agent_eval__", `${promptId}.tsx`), code, { scriptKind: ScriptKind.TSX, overwrite: true });
  const imports = new Map<string, SheenImport>();
  const namespaces = new Map<string, string>();
  const importErrors: string[] = [];
  for (const declaration of source.getImportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue();
    if (!publicImport(specifier)) importErrors.push(`Non-public dependency import: ${specifier}`);
    if (!(specifier === "@gemologic/sheen" || specifier.startsWith("@gemologic/sheen-"))) continue;
    const namespace = declaration.getNamespaceImport();
    if (namespace) namespaces.set(namespace.getText(), specifier);
    const defaultImport = declaration.getDefaultImport();
    if (defaultImport) imports.set(defaultImport.getText(), { package: specifier, imported: "default" });
    for (const named of declaration.getNamedImports()) {
      imports.set(named.getAliasNode()?.getText() ?? named.getName(), { package: specifier, imported: named.getName() });
    }
  }

  const hallucinated = new Set<string>();
  let interactiveElements = 0;
  let sheenInteractiveElements = 0;
  const openings = [
    ...source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...source.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  for (const opening of openings) {
    const tag = opening.getTagNameNode().getText();
    const attributes = opening.getAttributes()
      .filter(attribute => attribute.isKind(SyntaxKind.JsxAttribute))
      .map(attribute => attribute.getNameNode().getText());
    if (/^[a-z]/u.test(tag)) {
      if (nativeInteractive(tag, attributes)) interactiveElements += 1;
      continue;
    }
    const parts = tag.split(".");
    const direct = imports.get(tag);
    const namespacePackage = parts.length === 2 && parts[0] ? namespaces.get(parts[0]) : undefined;
    const imported = direct ?? (namespacePackage && parts[1] ? { package: namespacePackage, imported: parts[1] } : undefined);
    if (!imported) continue;
    const component = componentForImport(components, imported);
    if (!component) {
      hallucinated.add(`${imported.package}.${imported.imported}`);
      continue;
    }
    for (const attribute of attributes) {
      if (!(attribute in component.props)) hallucinated.add(`${component.name}.${attribute}`);
    }
    if (interactiveRole(component.role)) {
      interactiveElements += 1;
      sheenInteractiveElements += 1;
    }
  }

  const eslint = new ESLint();
  const [lint] = await eslint.lintText(code, { filePath: source.getFilePath() });
  if (!lint) throw new Error(`ESLint returned no result for ${promptId}`);
  const typeErrors = project.getPreEmitDiagnostics().map(diagnostic => diagnosticText(
    diagnostic.getCode(),
    diagnostic.getLineNumber(),
    ts.flattenDiagnosticMessageText(diagnostic.compilerObject.messageText, "\n"),
  ));
  return {
    promptId,
    generatedLines: code.split(/\r?\n/u).filter(line => line.trim().length > 0).length,
    lintErrors: lint.errorCount,
    interactiveElements,
    sheenInteractiveElements,
    hallucinatedProps: [...hallucinated].sort(),
    typeErrors,
    importErrors: importErrors.sort(),
  };
}

export async function auditEvalBaselineSources(root: string): Promise<readonly EvalSourceAnalysis[]> {
  const suiteValue: unknown = JSON.parse(await readFile(join(root, "evals", "v1", "prompts.json"), "utf8"));
  const suite = parseEvalSuite(suiteValue);
  const baselineRoot = join(root, "evals", "v1", "baseline");
  const reportsValue: unknown = JSON.parse(await readFile(join(baselineRoot, "reports.json"), "utf8"));
  const reports = parseEvalReports(reportsValue);
  const reportsByPrompt = new Map(reports.map(report => [report.promptId, report]));
  const analyses: EvalSourceAnalysis[] = [];
  for (const prompt of suite.prompts) {
    const value: unknown = JSON.parse(await readFile(join(baselineRoot, "outputs", `${prompt.id}.json`), "utf8"));
    if (!rawOutput(value)) throw new Error(`Invalid raw agent eval output ${prompt.id}`);
    const analysis = await analyzeEvalSource(root, prompt.id, value.code);
    analyses.push(analysis);
    if (analysis.typeErrors.length > 0) throw new Error(`Agent eval output ${prompt.id} does not typecheck:\n${analysis.typeErrors.join("\n")}`);
    if (analysis.importErrors.length > 0) throw new Error(`Agent eval output ${prompt.id} crosses package boundaries:\n${analysis.importErrors.join("\n")}`);
    const report = reportsByPrompt.get(prompt.id);
    if (!report) throw new Error(`Missing agent eval report ${prompt.id}`);
    if (report.generatedLines !== analysis.generatedLines) throw new Error(`Agent eval report ${prompt.id} generatedLines does not match source analysis`);
    if (report.lintErrors !== analysis.lintErrors) throw new Error(`Agent eval report ${prompt.id} lintErrors does not match source analysis`);
    if (report.interactiveElements !== analysis.interactiveElements) throw new Error(`Agent eval report ${prompt.id} interactiveElements does not match source analysis`);
    if (report.sheenInteractiveElements !== analysis.sheenInteractiveElements) throw new Error(`Agent eval report ${prompt.id} sheenInteractiveElements does not match source analysis`);
    if (!sameStrings([...report.hallucinatedProps].sort(), analysis.hallucinatedProps)) throw new Error(`Agent eval report ${prompt.id} hallucinatedProps does not match source analysis`);
  }
  return analyses;
}
