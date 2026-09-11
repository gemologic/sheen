import { codeToTokensWithThemes } from "shiki/bundle/web";
import type { HighlightCodeOptions, HighlightedCode, HighlightedToken } from "./types.ts";

const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

function tokenColor(value: string | undefined, mode: "light" | "dark"): string | undefined {
  if (value === undefined) return undefined;
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(value)) throw new Error(`Shiki returned an invalid ${mode} token color`);
  return value;
}

function hasStyle(light: number | undefined, dark: number | undefined, flag: number): boolean | undefined {
  return ((light ?? 0) & flag) !== 0 || ((dark ?? 0) & flag) !== 0 || undefined;
}

/** Highlight once in a loader or build step, then pass the serializable result to CodeBlock. */
export async function highlightCode(options: HighlightCodeOptions): Promise<HighlightedCode> {
  const result = await codeToTokensWithThemes(options.code, {
    lang: options.language,
    themes: { light: "github-light-default", dark: "github-dark-default" },
  });
  const lines = result.map(line => Object.freeze({
    tokens: Object.freeze(line.map((token): HighlightedToken => {
      const light = token.variants.light;
      const dark = token.variants.dark;
      const lightColor = tokenColor(light?.color, "light");
      const darkColor = tokenColor(dark?.color, "dark");
      return Object.freeze({
        content: token.content,
        ...(lightColor === undefined ? {} : { lightColor }),
        ...(darkColor === undefined ? {} : { darkColor }),
        ...(hasStyle(light?.fontStyle, dark?.fontStyle, ITALIC) ? { italic: true } : {}),
        ...(hasStyle(light?.fontStyle, dark?.fontStyle, BOLD) ? { bold: true } : {}),
        ...(hasStyle(light?.fontStyle, dark?.fontStyle, UNDERLINE) ? { underline: true } : {}),
      });
    })),
  }));
  return Object.freeze({ code: options.code, language: options.language, lines: Object.freeze(lines) });
}

export type { HighlightCodeOptions, HighlightedCode, HighlightedLine, HighlightedToken } from "./types.ts";
