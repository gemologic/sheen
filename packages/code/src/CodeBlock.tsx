import { Index, Show, createMemo, createSignal, createUniqueId, onCleanup, splitProps, type JSX } from "solid-js";
import { buttonVariants, cn, useTheme } from "@gemologic/sheen/core";
import { resolveCodeMessages } from "./messages.ts";
import type { HighlightedCode, HighlightedLine, HighlightedToken } from "./types.ts";

export interface CodeLineRange {
  readonly start: number;
  readonly end?: number;
}

export type CodeHighlightedLine = number | CodeLineRange;

export interface CodeBlockProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  readonly code: string;
  readonly language: string;
  readonly highlighted?: HighlightedCode;
  readonly highlightedLines?: readonly CodeHighlightedLine[];
  readonly label?: string;
  readonly filename?: string;
  readonly lineNumbers?: boolean;
  readonly showLanguage?: boolean;
  readonly copyable?: boolean;
  readonly wrapToggle?: boolean;
  readonly wrapped?: boolean;
  readonly defaultWrapped?: boolean;
  readonly onWrappedChange?: (wrapped: boolean) => void;
  readonly onCopyError?: (error: unknown) => void;
}

function tokenStyle(token: HighlightedToken): JSX.CSSProperties | undefined {
  if (token.lightColor === undefined && token.darkColor === undefined) return undefined;
  return {
    ...(token.lightColor === undefined ? {} : { "--sheen-code-token-light": token.lightColor }),
    ...(token.darkColor === undefined ? {} : { "--sheen-code-token-dark": token.darkColor }),
  };
}

function sourceLines(code: string): readonly HighlightedLine[] {
  return code.split("\n").map(content => ({ tokens: [{ content }] }));
}

function selectedLines(ranges: readonly CodeHighlightedLine[], count: number): ReadonlySet<number> {
  const selected = new Set<number>();
  for (const range of ranges) {
    const start = typeof range === "number" ? range : range.start;
    const end = typeof range === "number" ? range : range.end ?? range.start;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start || end > count) {
      throw new Error(`CodeBlock highlighted line range ${start}-${end} must be within 1-${count}`);
    }
    for (let line = start; line <= end; line += 1) selected.add(line);
  }
  return selected;
}

function describeLines(lines: ReadonlySet<number>, format: Intl.NumberFormat): string {
  const ordered = [...lines].sort((left, right) => left - right);
  const descriptions: string[] = [];
  let index = 0;
  while (index < ordered.length) {
    const start = ordered[index];
    if (start === undefined) break;
    let end = start;
    while (ordered[index + 1] === end + 1) {
      end += 1;
      index += 1;
    }
    descriptions.push(start === end ? format.format(start) : `${format.format(start)}–${format.format(end)}`);
    index += 1;
  }
  return descriptions.join(", ");
}

export function CodeBlock(props: CodeBlockProps) {
  const theme = useTheme();
  const [local, rest] = splitProps(props, ["class", "code", "language", "highlighted", "highlightedLines", "label", "filename", "lineNumbers", "showLanguage", "copyable", "wrapToggle", "wrapped", "defaultWrapped", "onWrappedChange", "onCopyError"]);
  const [uncontrolledWrapped, setUncontrolledWrapped] = createSignal(local.defaultWrapped ?? false);
  const [copyState, setCopyState] = createSignal<"idle" | "copied" | "failed">("idle");
  const messages = createMemo(() => resolveCodeMessages(theme.messages()));
  const descriptionId = createUniqueId();
  let copyRevision = 0;
  let resetTimer: number | undefined;
  const language = () => {
    if (!local.language.trim()) throw new Error("CodeBlock language must be nonempty");
    return local.language;
  };
  const lines = createMemo<readonly HighlightedLine[]>(() => {
    const highlighted = local.highlighted;
    if (highlighted === undefined) return sourceLines(local.code);
    if (highlighted.code !== local.code || highlighted.language !== language()) throw new Error("CodeBlock highlighted output must match code and language");
    if (highlighted.lines.length !== sourceLines(local.code).length) throw new Error("CodeBlock highlighted output must preserve source lines");
    if (highlighted.lines.map(line => line.tokens.map(token => token.content).join("")).join("\n") !== local.code) throw new Error("CodeBlock highlighted output must preserve source text");
    return highlighted.lines;
  });
  const selected = createMemo(() => selectedLines(local.highlightedLines ?? [], lines().length));
  const formatter = createMemo(() => new Intl.NumberFormat(theme.state().locale, { useGrouping: false }));
  const highlightDescription = createMemo(() => messages().codeHighlightedLines.replace("{lines}", describeLines(selected(), formatter())));
  const wrapped = () => local.wrapped ?? uncontrolledWrapped();
  const label = () => local.label?.trim() || local.filename?.trim() || `${language()} code`;
  const header = () => Boolean(local.label || local.filename || local.showLanguage || local.copyable || local.wrapToggle);
  function changeWrapped(): void {
    const next = !wrapped();
    if (local.wrapped === undefined) setUncontrolledWrapped(next);
    local.onWrappedChange?.(next);
  }
  async function copy(): Promise<void> {
    const revision = ++copyRevision;
    if (resetTimer !== undefined) window.clearTimeout(resetTimer);
    try {
      if (navigator.clipboard === undefined) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(local.code);
      if (revision !== copyRevision) return;
      setCopyState("copied");
    } catch (error) {
      if (revision !== copyRevision) return;
      setCopyState("failed");
      local.onCopyError?.(error);
    }
    resetTimer = window.setTimeout(() => {
      if (revision === copyRevision) setCopyState("idle");
    }, 2_000);
  }
  onCleanup(() => {
    copyRevision += 1;
    if (resetTimer !== undefined) window.clearTimeout(resetTimer);
  });
  const copyLabel = () => copyState() === "copied" ? messages().codeCopied : copyState() === "failed" ? messages().codeCopyFailed : messages().copyCode;
  return (
    <figure {...rest} class={cn("sheen-code-block", local.class)} data-language={language()} data-wrap={wrapped() ? "true" : "false"}>
      <Show when={header()}><figcaption class="sheen-code-block-header">
        <span class="sheen-code-block-identity">
          <Show when={local.filename}><strong class="sheen-code-block-filename">{local.filename}</strong></Show>
          <Show when={local.label && local.filename}><span class="sheen-code-block-label">{local.label}</span></Show>
          <Show when={local.label && !local.filename}><span class="sheen-code-block-label">{local.label}</span></Show>
          <Show when={local.showLanguage}><span class="sheen-code-block-language">{language()}</span></Show>
        </span>
        <Show when={local.copyable || local.wrapToggle}><span class="sheen-code-block-actions">
          <Show when={local.wrapToggle}><button type="button" class={cn(buttonVariants({ variant: "ghost", size: "xs" }), "sheen-code-block-action")} aria-pressed={wrapped()} onClick={changeWrapped}>{wrapped() ? messages().stopWrappingCode : messages().wrapCode}</button></Show>
          <Show when={local.copyable}><button type="button" class={cn(buttonVariants({ variant: "ghost", size: "xs" }), "sheen-code-block-action")} aria-live="polite" onClick={() => { void copy(); }}>{copyLabel()}</button></Show>
        </span></Show>
      </figcaption></Show>
      <Show when={selected().size > 0}><span id={descriptionId} class="sheen-code-block-description">{highlightDescription()}</span></Show>
      <pre tabindex="0" aria-label={label()} aria-describedby={selected().size > 0 ? descriptionId : undefined}><code>
        <Index each={lines()}>{(line, index) => {
          const number = index + 1;
          return <span class="sheen-code-block-line" data-line={number} data-highlighted={selected().has(number) ? "true" : undefined}>
            <Show when={local.lineNumbers}><span class="sheen-code-block-line-number" aria-hidden="true">{formatter().format(number)}</span></Show>
            <Index each={line().tokens}>{token => (
              <span
                class={cn("sheen-code-block-token", token().italic && "is-italic", token().bold && "is-bold", token().underline && "is-underlined")}
                style={tokenStyle(token())}
              >{token().content}</span>
            )}</Index>{number < lines().length ? "\n" : ""}
          </span>;
        }}</Index>
      </code></pre>
    </figure>
  );
}
