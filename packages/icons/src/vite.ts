import type { Plugin } from "vite";
import { iconData } from "./generated/catalog.ts";
import { isIconName } from "./registry.ts";
import type { IconName, IconSetName } from "./registry.ts";

export interface SheenIconsOptions {
  /** Sets included by transformed literal icons. First entry is the fallback when no theme attribute is present. */
  readonly sets?: readonly IconSetName[];
  /** Module specifiers from which the Icon marker may be imported. */
  readonly imports?: readonly string[];
}

interface Replacement { readonly start: number; readonly end: number; readonly value: string }

function localIconBindings(code: string, modules: readonly string[]): readonly string[] {
  const names: string[] = [];
  const imports = /import\s*\{([^}]*)\}\s*from\s*(["'])([^"']+)\2/g;
  for (const match of code.matchAll(imports)) {
    const specifiers = match[1], module = match[3];
    if (!specifiers || !module || !modules.includes(module)) continue;
    for (const specifier of specifiers.split(",")) {
      const binding = /^\s*Icon(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*$/.exec(specifier);
      if (binding) names.push(binding[1] ?? "Icon");
    }
  }
  return names;
}

function tagEnd(code: string, start: number): number {
  let quote: "\"" | "'" | "`" | undefined;
  let braces = 0;
  for (let index = start; index < code.length; index++) {
    const character = code[index];
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") quote = character;
    else if (character === "{") braces++;
    else if (character === "}") braces--;
    else if (character === ">" && braces === 0) return index + 1;
  }
  return -1;
}

function iconTagRanges(code: string, binding: string): readonly { readonly start: number; readonly end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let quote: "\"" | "'" | "`" | undefined;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < code.length; index++) {
    const character = code[index], next = code[index + 1];
    if (lineComment) { if (character === "\n") lineComment = false; continue; }
    if (blockComment) { if (character === "*" && next === "/") { blockComment = false; index++; } continue; }
    if (quote) {
      if (character === "\\") index++;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "/" && next === "/") { lineComment = true; index++; continue; }
    if (character === "/" && next === "*") { blockComment = true; index++; continue; }
    if (character === "\"" || character === "'" || character === "`") { quote = character; continue; }
    if (character !== "<" || !code.startsWith(binding, index + 1)) continue;
    const boundary = code[index + binding.length + 1];
    if (boundary && !/[\s/>]/.test(boundary)) continue;
    const end = tagEnd(code, index);
    ranges.push({ start: index, end });
    if (end > index) index = end - 1;
  }
  return ranges;
}

function componentName(name: IconName): string {
  return `${name.slice(0, 1).toUpperCase()}${name.slice(1)}Icon`;
}

function virtualId(name: IconName, sets: readonly IconSetName[]): string {
  return `virtual:sheen-icon/${sets.join("+")}/${name}`;
}

export function sheenIcons(options: SheenIconsOptions = {}): Plugin {
  const sets = Object.freeze([...(options.sets ?? ["radix"])]);
  if (!sets.length || sets.length > 2 || new Set(sets).size !== sets.length || sets.some(set => set !== "radix" && set !== "phosphor")) {
    throw new Error("sheenIcons sets must contain one or two unique supported icon sets");
  }
  const modules = options.imports ?? ["@gemologic/sheen-icons", "@gemologic/sheen"];
  const resolvedPrefix = "\0sheen-icon/";
  return {
    name: "sheen-literal-icons",
    enforce: "pre",
    resolveId(id) { return id.startsWith("virtual:sheen-icon/") ? `${resolvedPrefix}${id.slice("virtual:sheen-icon/".length)}` : null; },
    load(id) {
      if (!id.startsWith(resolvedPrefix)) return null;
      const parts = id.slice(resolvedPrefix.length).split("/");
      const encodedSets = parts[0], rawName = parts[1];
      if (!encodedSets || !rawName || !isIconName(rawName)) throw new Error(`Invalid virtual sheen icon id: ${id}`);
      const selectedSets = encodedSets.split("+").filter((set): set is IconSetName => set === "radix" || set === "phosphor");
      const selected = selectedSets.map(set => iconData[rawName].find(icon => icon.set === set));
      if (selected.some(icon => !icon)) throw new Error(`Incomplete generated icon data for ${rawName}`);
      return `import { createStaticIcon } from "@gemologic/sheen-icons/runtime";\nexport default createStaticIcon(${JSON.stringify(rawName)}, ${JSON.stringify(selected)});\n`;
    },
    transform(code, id) {
      if (!/\.[cm]?[jt]sx(?:\?|$)/.test(id)) return null;
      const bindings = localIconBindings(code, modules);
      if (!bindings.length) return null;
      const replacements: Replacement[] = [];
      const imports = new Map<IconName, string>();
      for (const binding of bindings) {
        for (const range of iconTagRanges(code, binding)) {
          if (range.end < 0) this.error(`Unterminated ${binding} element in ${id}`, range.start);
          const tag = code.slice(range.start, range.end);
          if (!/\/\s*>$/.test(tag)) this.error(`${binding} must be self-closing`, range.start);
          const literal = /\sname\s*=\s*(["'])([A-Za-z][A-Za-z0-9]*)\1/.exec(tag);
          if (!literal) { this.warn(`${id}: dynamic Icon name retained; use DynamicIcon to make the full-registry cost explicit`); continue; }
          const rawName = literal[2];
          if (!rawName || !isIconName(rawName)) this.error(`Unknown semantic icon ${JSON.stringify(rawName)} in ${id}`, range.start);
          const alias = `Sheen${componentName(rawName)}`;
          imports.set(rawName, alias);
          const relativeStart = literal.index;
          const nameEnd = relativeStart + literal[0].length;
          replacements.push({ start: range.start, end: range.start + binding.length + 1, value: `<${alias}` });
          replacements.push({ start: range.start + relativeStart, end: range.start + nameEnd, value: "" });
        }
      }
      if (!replacements.length) return null;
      let transformed = code;
      for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
        transformed = transformed.slice(0, replacement.start) + replacement.value + transformed.slice(replacement.end);
      }
      const injected = [...imports].map(([name, alias]) => `import ${alias} from ${JSON.stringify(virtualId(name, sets))};`).join("\n");
      return { code: `${injected}\n${transformed}`, map: null };
    },
  };
}
