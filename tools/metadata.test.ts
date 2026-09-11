import { describe, expect, it } from "vitest";
import { Project, ts } from "ts-morph";
import { componentExports, exampleModule, inspectProps, portableTypeText } from "./metadata.ts";
import { defineMeta, isComponentMetadata } from "../packages/ui/src/metadata.ts";
import type { ComponentMetadata, ComposerMetadata } from "../packages/ui/src/metadata.ts";

function metadata(overrides: Partial<ComponentMetadata> = {}): ComponentMetadata {
  return { name: "Button", package: "test", category: "primitives", summary: "Action", props: { size: { description: "Size", default: "sm" } }, tokens: [], a11y: { role: "button", keyboard: ["Enter"] }, examples: [{ title: "Small", code: '<Button size="sm" />' }], guidance: { do: ["Use for actions"], dont: [] }, ...overrides };
}

function fixture() {
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { strict: true, noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2023 } });
  project.createSourceFile("/node_modules/native/index.ts", 'export interface Native { disabled?: boolean; children?: string }');
  project.createSourceFile("/node_modules/solid-js/index.d.ts", 'export type ComponentProps<T> = T extends (props: infer P) => unknown ? P : never;');
  project.createSourceFile("/component.ts", 'import type { Native } from "./node_modules/native/index"; export interface Props extends Native { size?: "sm" | "lg" } export function Button(_props: Props) { return "button"; } export const Input = (_props: { label: string }) => "input"; export function useHelper() { return 1; }');
  const entry = project.createSourceFile("/index.ts", 'export { Button, Input, Button as Alias, useHelper } from "./component"; export type { Props } from "./component";');
  const button = componentExports(entry).find(item => item.name === "Button");
  if (!button) throw new Error("Expected real exported component");
  return { project, entry, button };
}

describe("component metadata contract", () => {
  it("discovers function, arrow, and aliased exports without mistaking types or hooks for components", () => {
    expect(componentExports(fixture().entry).map(item => item.name)).toEqual(["Alias", "Button", "Input"]);
  });
  it("enumerates all props, including native inherited properties, without sampling", () => {
    const result = inspectProps(fixture().button, metadata());
    expect(result.errors).toEqual([]);
    expect(Object.keys(result.props).sort()).toEqual(["children", "disabled", "size"]);
    expect(result.props.disabled?.inherited).toBe(true);
    expect(result.props.size?.inherited).toBe(false);
    expect(result.props.size?.type).toContain('"lg"');
  });
  it("fails missing, removed, renamed, and newly added sheen props", () => {
    const { button, project, entry } = fixture();
    expect(inspectProps(button, metadata({ props: {} })).errors).toContain("Button.size: missing prop metadata");
    expect(inspectProps(button, metadata({ props: { ...metadata().props, gone: { description: "Stale" } } })).errors).toContain("Button.gone: metadata documents an unknown prop");
    project.getSourceFileOrThrow("/component.ts").getInterfaceOrThrow("Props").addProperty({ name: "loading", type: "boolean", hasQuestionToken: true });
    const updated = componentExports(entry).find(item => item.name === "Button");
    if (!updated) throw new Error("Missing updated component");
    expect(inspectProps(updated, metadata()).errors).toContain("Button.loading: missing prop metadata");
    expect(inspectProps(button, metadata({ name: "Other" })).errors).toContain("Button: metadata name is Other");
  });
  it("compiles extracted examples and rejects stale defaults and control values", () => {
    const { project, button } = fixture();
    const imports = 'import { Button } from "./component";';
    const source = project.createSourceFile("/examples.tsx", exampleModule(button, metadata(), imports));
    expect(project.getPreEmitDiagnostics().map(item => item.getMessageText())).toEqual([]);
    source.replaceWithText(exampleModule(button, metadata({ props: { size: { description: "Size", default: "nonexistent", control: { kind: "select", values: ["also-invalid"] } } } }), imports));
    expect(project.getPreEmitDiagnostics()).toHaveLength(2);
    source.replaceWithText(exampleModule(button, metadata({ examples: [{ title: "Wrong prop", code: '<Button hallucinated="yes" />' }, { title: "Wrong enum", code: '<Button size="huge" />' }] }), imports));
    expect(project.getPreEmitDiagnostics()).toHaveLength(2);
  });
  it("rejects empty examples and malformed runtime metadata", () => {
    expect(isComponentMetadata(metadata({ examples: [] }))).toBe(false);
    expect(isComponentMetadata({ ...metadata(), examples: [{ title: "Bad import", code: "null", imports: 12 }] })).toBe(false);
    expect(isComponentMetadata({ ...metadata(), props: { size: { description: "", default: "sm" } } })).toBe(false);
    expect(() => defineMeta<{ size?: string }>({ ...metadata(), examples: [] })).toThrow("Invalid component metadata");
  });
  it("requires complete opt-in Composer metadata with known semantic parent regions", () => {
    const composer = { allowedParentRegions: ["toolbar"], acceptedChildRegions: [], editableSafeProps: ["size"], fixtureFactory: "button", codeGenerationAdapter: "props" } satisfies ComposerMetadata;
    expect(isComponentMetadata(metadata({ composer }))).toBe(true);
    expect(isComponentMetadata({ ...metadata(), composer: { ...composer, allowedParentRegions: [] } })).toBe(false);
    expect(isComponentMetadata({ ...metadata(), composer: { ...composer, allowedParentRegions: ["floating-pixels"] } })).toBe(false);
    expect(isComponentMetadata({ ...metadata(), composer: { ...composer, fixtureFactory: "" } })).toBe(false);
    expect(isComponentMetadata({ ...metadata(), composer: { ...composer, editableSafeProps: [12] } })).toBe(false);
  });
  it("typechecks explicit cross-module example imports and deduplicates shared declarations", () => {
    const { project, button } = fixture();
    project.createSourceFile("/helper.ts", 'export const size = "sm";');
    const examples = [
      { title: "Imported size", imports: 'import { size } from "./helper";', code: "<Button size={size} />" },
      { title: "Shared import", imports: 'import { size } from "./helper";', code: "<Button size={size} />" },
    ];
    const source = project.createSourceFile("/examples.tsx", exampleModule(button, metadata({ examples }), 'import { Button } from "./component";'));
    expect(project.getPreEmitDiagnostics()).toHaveLength(0);
    source.replaceWithText(exampleModule(button, metadata({ examples: [{ title: "Missing export", imports: 'import { absent } from "./helper";', code: "<Button size={absent} />" }] }), 'import { Button } from "./component";'));
    expect(project.getPreEmitDiagnostics()).toHaveLength(1);
  });
  it("requires complete select controls and removes installation-specific paths from types", () => {
    const result = inspectProps(fixture().button, metadata({ props: { size: { description: "Size", control: { kind: "select", values: ["sm"] } } } }));
    expect(result.errors).toContain('Button.size: select control omits "lg"');
    expect(portableTypeText('import("/repo/node_modules/.pnpm/library@1/node_modules/library").Value')).toBe('import("library").Value');
  });
  it("fails closed when props cannot be exhaustively enumerated", () => {
    const { project } = fixture();
    const entry = project.createSourceFile("/unbounded.ts", 'export function Flexible(_props: Record<string, string>) { return ""; } export function Unknown(_props: unknown) { return ""; }');
    for (const component of componentExports(entry)) {
      expect(inspectProps(component, metadata({ name: component.name, props: {} })).errors).toContain(`${component.name}: props must be a finite, enumerable contract`);
    }
  });
  it("resolves mapped native props through local inheritance and direct aliases", () => {
    const { project } = fixture();
    project.getSourceFileOrThrow("/node_modules/native/index.ts").replaceWithText('type Directives = { [K in "use:listener"]?: string }; export interface Native extends Directives { disabled?: boolean }');
    const entry = project.createSourceFile("/nested.ts", 'import type { Native } from "./node_modules/native/index"; interface Local extends Native { gap?: string } interface Nested extends Local { wrap?: boolean } export function Row(_props: Nested) { return ""; } export function Center(_props: Native) { return ""; }');
    for (const component of componentExports(entry)) {
      const props = component.name === "Row" ? { gap: { description: "Gap" }, wrap: { description: "Wrap" } } : {};
      const result = inspectProps(component, metadata({ name: component.name, props }));
      expect(result.errors).toEqual([]);
      expect(result.props["use:listener"]?.inherited).toBe(true);
    }
  });
});
