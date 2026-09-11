import { Node, TypeFormatFlags } from "ts-morph";
import type { SourceFile, Type } from "ts-morph";
import type { ComponentMetadata, PropMetadata } from "../packages/ui/src/metadata.ts";

export interface ExportedComponent { readonly name: string; readonly declaration: Node; readonly props: Type }
export interface ManifestProp extends PropMetadata { readonly type: string; readonly required: boolean; readonly inherited: boolean }

function externalDeclarations(nodes: readonly Node[]): boolean {
  return nodes.length > 0 && nodes.every(node => node.getSourceFile().getFilePath().includes("/node_modules/"));
}

function inheritsMappedNative(type: Type, name: string, seen = new Set<Type>()): boolean {
  if (seen.has(type) || !type.getProperty(name)) return false;
  seen.add(type);
  if (externalDeclarations(type.getSymbol()?.getDeclarations() ?? [])) return true;
  return [...type.getBaseTypes(), ...type.getIntersectionTypes()].some(base => inheritsMappedNative(base, name, seen));
}

export function portableTypeText(value: string): string {
  return value.replace(/import\("([^"]+)"\)/g, (expression: string, path: string) => {
    const marker = "node_modules/";
    const index = path.lastIndexOf(marker);
    return index < 0 ? expression : `import(${JSON.stringify(path.slice(index + marker.length))})`;
  });
}

/** Capitalized callable exports are the component inventory, including aliases and re-exports. */
export function componentExports(entry: SourceFile): ExportedComponent[] {
  const result: ExportedComponent[] = [];
  for (const [name, declarations] of entry.getExportedDeclarations()) {
    if (!/^[A-Z]/.test(name)) continue;
    const declaration = declarations.find(node => !Node.isInterfaceDeclaration(node) && !Node.isTypeAliasDeclaration(node));
    if (!declaration) continue;
    const signatures = declaration.getType().getCallSignatures();
    if (!signatures.length) continue;
    if (signatures.length !== 1) throw new Error(`${name}: overloaded component signatures require an explicit unified props contract`);
    const parameter = signatures[0]?.getParameters()[0];
    if (!parameter) throw new Error(`${name}: components must declare their props contract`);
    result.push({ name, declaration, props: parameter.getTypeAtLocation(declaration) });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function inspectProps(component: ExportedComponent, metadata: ComponentMetadata): { props: Record<string, ManifestProp>; errors: string[] } {
  const errors: string[] = [];
  const props: Record<string, ManifestProp> = {};
  if (component.props.isAny() || component.props.isUnknown() || component.props.getStringIndexType() || component.props.getNumberIndexType()) errors.push(`${component.name}: props must be a finite, enumerable contract`);
  if (metadata.name !== component.name) errors.push(`${component.name}: metadata name is ${metadata.name}`);
  for (const property of component.props.getProperties()) {
    const name = property.getName();
    const declarations = property.getDeclarations();
    // Mapped native attributes can have no property declaration. Their external base still owns them.
    const inherited = externalDeclarations(declarations) || (declarations.length === 0 && inheritsMappedNative(component.props, name));
    const authored = metadata.props[name];
    if (!authored && !inherited) errors.push(`${component.name}.${name}: missing prop metadata`);
    const type = property.getTypeAtLocation(component.declaration);
    if (authored?.control?.kind === "select") {
      const variants = type.isUnion() ? type.getUnionTypes() : [type];
      for (const variant of variants) {
        if (variant.isUndefined()) continue;
        const value = variant.isNull() ? null : variant.isBooleanLiteral() ? variant.getText() === "true" : variant.getLiteralValue();
        if (value === undefined) { errors.push(`${component.name}.${name}: select controls require a finite literal type`); continue; }
        if (!authored.control.values.some(option => option === value)) errors.push(`${component.name}.${name}: select control omits ${JSON.stringify(value)}`);
      }
    }
    props[name] = {
      description: authored?.description ?? "Inherited Solid/HTML attribute; see the generated type.",
      ...authored,
      type: portableTypeText(type.getText(component.declaration, TypeFormatFlags.NoTruncation)),
      required: !property.isOptional(), inherited,
    };
  }
  for (const name of Object.keys(metadata.props)) if (!component.props.getProperty(name)) errors.push(`${component.name}.${name}: metadata documents an unknown prop`);
  return { props, errors };
}

/** Actual TypeScript checks these declarations and every extracted JSX example. */
export function exampleModule(component: ExportedComponent, metadata: ComponentMetadata, imports: string): string {
  const lines = [imports, 'import type { ComponentProps } from "solid-js";'];
  lines.push(...new Set(metadata.examples.flatMap(example => example.imports ? [example.imports] : [])));
  let assertion = 0;
  for (const [name, prop] of Object.entries(metadata.props)) {
    const values = [...("default" in prop ? [prop.default] : []), ...(prop.control?.kind === "select" ? prop.control.values : [])];
    if (prop.control?.kind === "boolean") values.push(true, false);
    if (prop.control?.kind === "text") values.push("example");
    for (const value of values) lines.push(`export const propCheck${assertion++}: ComponentProps<typeof ${component.name}>[${JSON.stringify(name)}] = ${JSON.stringify(value)};`);
  }
  metadata.examples.forEach((example, index) => {
    lines.push(`export function Example${index}() {\n${example.setup ?? ""}\nreturn (${example.code});\n}`);
  });
  return lines.join("\n");
}
