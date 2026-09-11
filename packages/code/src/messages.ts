import type { Messages } from "@gemologic/sheen/core";

export interface CodeMessages {
  readonly copyCode: string;
  readonly codeCopied: string;
  readonly codeCopyFailed: string;
  readonly wrapCode: string;
  readonly stopWrappingCode: string;
  readonly codeHighlightedLines: string;
  readonly viewerSearch: string;
  readonly viewerCopy: string;
  readonly viewerCopied: string;
  readonly viewerCopyFailed: string;
  readonly viewerMatches: string;
}

export const englishCodeMessages: CodeMessages = Object.freeze({
  copyCode: "Copy code",
  codeCopied: "Copied",
  codeCopyFailed: "Copy failed",
  wrapCode: "Wrap code",
  stopWrappingCode: "Stop wrapping code",
  codeHighlightedLines: "Highlighted lines: {lines}",
  viewerSearch: "Search {label}",
  viewerCopy: "Copy {label}",
  viewerCopied: "Copied",
  viewerCopyFailed: "Copy failed",
  viewerMatches: "{matches} of {total} lines",
});

export function resolveCodeMessages(messages: Messages): CodeMessages {
  return Object.freeze({
    copyCode: messages.copyCode ?? englishCodeMessages.copyCode,
    codeCopied: messages.codeCopied ?? englishCodeMessages.codeCopied,
    codeCopyFailed: messages.codeCopyFailed ?? englishCodeMessages.codeCopyFailed,
    wrapCode: messages.wrapCode ?? englishCodeMessages.wrapCode,
    stopWrappingCode: messages.stopWrappingCode ?? englishCodeMessages.stopWrappingCode,
    codeHighlightedLines: messages.codeHighlightedLines ?? englishCodeMessages.codeHighlightedLines,
    viewerSearch: messages.viewerSearch ?? englishCodeMessages.viewerSearch,
    viewerCopy: messages.viewerCopy ?? englishCodeMessages.viewerCopy,
    viewerCopied: messages.viewerCopied ?? englishCodeMessages.viewerCopied,
    viewerCopyFailed: messages.viewerCopyFailed ?? englishCodeMessages.viewerCopyFailed,
    viewerMatches: messages.viewerMatches ?? englishCodeMessages.viewerMatches,
  });
}
