import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildTheme, currentSchemaVersion, defineTheme, obsidian, ThemeValidationError,
} from "@gemologic/sheen-tokens";
import type { ThemeDefinition } from "@gemologic/sheen-tokens";

const definition = {
  ...obsidian,
  schemaVersion: currentSchemaVersion,
  id: "private-example",
  label: "Private example",
  dark: { ...obsidian.dark, "surface-radius": "9px" },
} satisfies ThemeDefinition;
const theme = defineTheme(definition);
assert.equal(theme.dark["surface-radius"], "9px");
const css = buildTheme(theme);
assert.match(css, /data-sheen-theme="private-example"/);
assert.match(css, /--sheen-surface-radius: 9px/);
assert.match(css, /@supports/);
assert.doesNotMatch(css, /\{gray\./);
assert.throws(() => defineTheme({ ...definition, schemaVersion: 999 }), ThemeValidationError);
assert.throws(() => defineTheme({ ...definition, dark: {} }), /missing token/);
assert.throws(() => defineTheme({ ...definition, dark: { ...definition.dark, "chart-8": "not-a-color" } }), /chart-8/);
for (const entry of ["core.css", "fonts.css", "preset.css", "themes.css", "themes/obsidian.css", "accents/jade.css"]) {
  const url = import.meta.resolve(`@gemologic/sheen-tokens/${entry}`);
  assert.ok((await readFile(new URL(url), "utf8")).length > 0);
}
const fontCssUrl = import.meta.resolve("@gemologic/sheen-tokens/fonts.css");
const fontCss = await readFile(new URL(fontCssUrl), "utf8");
assert.doesNotMatch(fontCss, /(?:https?:)?\/\//, "font CSS must not load cross-origin assets");
const fontUrls = [...fontCss.matchAll(/url\("(?<path>\.\/fonts\/[^\"]+\.woff2)"\)/g)].flatMap(match => match.groups?.path ? [match.groups.path] : []);
assert.equal(fontUrls.length, 3);
for (const path of fontUrls) {
  const value = await readFile(new URL(path, fontCssUrl));
  assert.equal(value.subarray(0, 4).toString("ascii"), "wOF2");
}
console.log("Private theme package exports, types, validation, and CSS entries passed");
