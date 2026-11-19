import type { LanguageRegistration } from "shiki/core";

export interface HighlightedToken {
  readonly content: string;
  readonly lightColor?: string;
  readonly darkColor?: string;
  readonly italic?: boolean;
  readonly bold?: boolean;
  readonly underline?: boolean;
}

/** A lazily loaded grammar exported by `@gemologic/sheen-code/languages`. */
export interface CodeLanguage {
  readonly id: string;
  readonly aliases: readonly string[];
  readonly load: () => Promise<{ readonly default: LanguageRegistration[] }>;
}

export type CodeLanguageName<Language extends CodeLanguage> = Language["id"] | Language["aliases"][number];

export interface HighlightCodeOptions<Language extends CodeLanguage = CodeLanguage> {
  readonly code: string;
  /** Grammar id or alias from one of the declared `languages`. */
  readonly language: NoInfer<CodeLanguageName<Language>>;
  /** Grammars this call may load. Only imported definitions emit consumer chunks. */
  readonly languages: readonly Language[];
  readonly signal?: AbortSignal;
}

export interface HighlightedLine {
  readonly tokens: readonly HighlightedToken[];
}

export interface HighlightedCode {
  readonly code: string;
  readonly language: string;
  readonly lines: readonly HighlightedLine[];
}
