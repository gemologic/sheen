export interface HighlightedToken {
  readonly content: string;
  readonly lightColor?: string;
  readonly darkColor?: string;
  readonly italic?: boolean;
  readonly bold?: boolean;
  readonly underline?: boolean;
}

export interface HighlightCodeOptions {
  readonly code: string;
  readonly language: BundledLanguage;
}

export interface HighlightedLine {
  readonly tokens: readonly HighlightedToken[];
}

export interface HighlightedCode {
  readonly code: string;
  readonly language: string;
  readonly lines: readonly HighlightedLine[];
}
import type { BundledLanguage } from "shiki/bundle/web";
