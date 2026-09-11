import { cp, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { accentNames, buildAccent, buildTheme, buildAccents, buildCore, buildPreset, themes } from "../packages/tokens/src/index.ts";

const dist = new URL("../packages/tokens/dist/", import.meta.url);
await mkdir(new URL("themes/", dist), { recursive: true });
await mkdir(new URL("accents/", dist), { recursive: true });
await cp(new URL("../packages/tokens/assets/fonts/", import.meta.url), new URL("fonts/", dist), { recursive: true });
await cp(new URL("../packages/tokens/assets/fonts.css", import.meta.url), new URL("fonts.css", dist));
const outputs = themes.map(theme => ({ theme, css: buildTheme(theme) }));
const accentOutputs = accentNames.map(name => ({ name, css: buildAccent(name) }));
const accentCss = buildAccents();
await Promise.all([
  writeFile(new URL("core.css", dist), buildCore()),
  writeFile(new URL("preset.css", dist), buildPreset()),
  writeFile(new URL("themes.css", dist), outputs.map(({ css }) => css).join("\n") + accentCss),
  ...outputs.map(({ theme, css }) => writeFile(new URL(`themes/${theme.id}.css`, dist), css)),
  ...accentOutputs.map(({ name, css }) => writeFile(new URL(`accents/${name}.css`, dist), css)),
]);
console.log(`Built ${outputs.length} themes, 12 accents, and self-hosted font assets in ${fileURLToPath(dist)}`);
