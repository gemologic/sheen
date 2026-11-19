import { createHighlighterCore } from "shiki/core";
import type { HighlighterCore } from "shiki/core";
import type { CodeLanguage, HighlightCodeOptions, HighlightedCode, HighlightedToken } from "./types.ts";

const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;
const THEMES = { light: "github-light-default", dark: "github-dark-default" } as const;

let highlighter: Promise<HighlighterCore> | undefined;
const loadedLanguages = new Map<CodeLanguage, Promise<void>>();

function sharedHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    engine: import("shiki/engine/javascript").then(module => module.createJavaScriptRegexEngine()),
    themes: [import("shiki/themes/github-light-default.mjs"), import("shiki/themes/github-dark-default.mjs")],
  }).catch((error: unknown) => {
    highlighter = undefined;
    throw error;
  });
  return highlighter;
}

function loadLanguage(core: HighlighterCore, language: CodeLanguage): Promise<void> {
  let loaded = loadedLanguages.get(language);
  if (loaded === undefined) {
    loaded = language.load().then(module => core.loadLanguage(module.default)).catch((error: unknown) => {
      loadedLanguages.delete(language);
      throw error;
    });
    loadedLanguages.set(language, loaded);
  }
  return loaded;
}

function tokenColor(value: string | undefined, mode: "light" | "dark"): string | undefined {
  if (value === undefined) return undefined;
  if (!/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu.test(value)) throw new Error(`Shiki returned an invalid ${mode} token color`);
  return value;
}

function hasStyle(light: number | undefined, dark: number | undefined, flag: number): boolean | undefined {
  return ((light ?? 0) & flag) !== 0 || ((dark ?? 0) & flag) !== 0 || undefined;
}

/** Highlight once in a loader or build step, then pass the serializable result to CodeBlock. */
export async function highlightCode<const Language extends CodeLanguage>(options: HighlightCodeOptions<Language>): Promise<HighlightedCode> {
  const definition = options.languages.find(language => language.id === options.language || language.aliases.includes(options.language));
  if (definition === undefined) throw new Error(`highlightCode language "${options.language}" is not one of the declared languages`);
  options.signal?.throwIfAborted();
  const core = await sharedHighlighter();
  options.signal?.throwIfAborted();
  await loadLanguage(core, definition);
  options.signal?.throwIfAborted();
  const result = core.codeToTokensWithThemes(options.code, { lang: definition.id, themes: THEMES });
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

export type { CodeLanguage, CodeLanguageName, HighlightCodeOptions, HighlightedCode, HighlightedLine, HighlightedToken } from "./types.ts";
