import { Button, Input } from "@gemologic/sheen";
import { cn, useTheme } from "@gemologic/sheen/core";
import { Index, Show, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { resolveCodeMessages } from "./messages.ts";
import { filterViewerRows, validateViewerRows, viewerWindow } from "./viewer-model.ts";
import type { ViewerTextRow } from "./viewer-model.ts";

export interface VirtualTextViewerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  readonly rows: readonly ViewerTextRow[];
  readonly copyText: string;
  readonly label: string;
  readonly searchable: boolean;
  readonly copyable: boolean;
  readonly initialHeight: number;
  readonly lineHeight: number;
  readonly onCopyError?: (error: unknown) => void;
}

function highlightedText(text: string, query: string, locale: string): JSX.Element {
  const normalized = query.trim().toLocaleLowerCase(locale);
  if (!normalized) return text;
  const index = text.toLocaleLowerCase(locale).indexOf(normalized);
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.trim().length)}</mark>{text.slice(index + query.trim().length)}</>;
}

export function VirtualTextViewer(props: VirtualTextViewerProps): JSX.Element {
  const [local, rest] = splitProps(props, ["rows", "copyText", "label", "searchable", "copyable", "initialHeight", "lineHeight", "onCopyError", "class", "ref"]);
  if (!local.label.trim()) throw new Error("Viewer label must be nonempty");
  if (!Number.isFinite(local.initialHeight) || local.initialHeight < 120 || local.initialHeight > 1_200) throw new Error("Viewer initialHeight must be from 120 to 1200 pixels");
  if (!Number.isFinite(local.lineHeight) || local.lineHeight < 16 || local.lineHeight > 48) throw new Error("Viewer lineHeight must be from 16 to 48 pixels");
  const theme = useTheme();
  const messages = createMemo(() => resolveCodeMessages(theme.messages()));
  const rows = createMemo(() => validateViewerRows(local.rows));
  const [draft, setDraft] = createSignal("");
  const [query, setQuery] = createSignal("");
  const [scrollTop, setScrollTop] = createSignal(0);
  const [height, setHeight] = createSignal(local.initialHeight);
  const [copyState, setCopyState] = createSignal<"idle" | "copied" | "failed">("idle");
  let viewport: HTMLDivElement | undefined;
  let searchTimer: number | undefined;
  let copyTimer: number | undefined;
  let copyRevision = 0;
  const filtered = createMemo(() => filterViewerRows(rows(), query(), theme.state().locale));
  const range = createMemo(() => viewerWindow(filtered().length, scrollTop(), height(), local.lineHeight));
  const visible = createMemo(() => filtered().slice(range().start, range().end));
  const matchStatus = createMemo(() => messages().viewerMatches.replace("{matches}", String(filtered().length)).replace("{total}", String(rows().length)));
  const copyLabel = () => copyState() === "copied" ? messages().viewerCopied : copyState() === "failed" ? messages().viewerCopyFailed : messages().viewerCopy.replace("{label}", local.label);
  const searchLabel = () => messages().viewerSearch.replace("{label}", local.label);

  const scheduleSearch = (value: string): void => {
    setDraft(value);
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchTimer = undefined;
      setQuery(value);
      setScrollTop(0);
      viewport?.scrollTo({ top: 0 });
    }, 100);
  };
  const copy = async (): Promise<void> => {
    const revision = ++copyRevision;
    if (copyTimer !== undefined) window.clearTimeout(copyTimer);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(local.copyText);
      if (revision !== copyRevision) return;
      setCopyState("copied");
    } catch (error) {
      if (revision !== copyRevision) return;
      setCopyState("failed");
      local.onCopyError?.(error);
    }
    copyTimer = window.setTimeout(() => { if (revision === copyRevision) setCopyState("idle"); }, 2_000);
  };
  onMount(() => {
    const element = viewport;
    if (!element) return;
    setHeight(element.clientHeight || local.initialHeight);
    const observer = new ResizeObserver(() => setHeight(element.clientHeight || local.initialHeight));
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });
  onCleanup(() => {
    copyRevision += 1;
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    if (copyTimer !== undefined) window.clearTimeout(copyTimer);
  });

  return <section {...rest} ref={local.ref} class={cn("sheen-text-viewer", local.class)} aria-label={local.label} style={{ "--sheen-viewer-height": `${local.initialHeight}px`, "--sheen-viewer-row-height": `${local.lineHeight}px` }}>
    <header class="sheen-text-viewer-header">
      <strong>{local.label}</strong>
      <Show when={local.searchable}><Input class="sheen-text-viewer-search" label={searchLabel()} value={draft()} onInput={event => scheduleSearch(event.currentTarget.value)} /></Show>
      <span class="sheen-text-viewer-status" role="status" aria-live="polite">{matchStatus()}</span>
      <Show when={local.copyable}><Button size="xs" variant="ghost" aria-live="polite" onClick={() => { void copy(); }}>{copyLabel()}</Button></Show>
    </header>
    <div ref={viewport} class="sheen-text-viewer-viewport" role="list" aria-label={`${local.label} lines`} tabIndex={0} onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <div class="sheen-text-viewer-spacer" aria-hidden="true" style={{ "--sheen-viewer-spacer": `${range().offsetBefore}px` }} />
      <Index each={visible()}>{(row, index) => <div class="sheen-text-viewer-row" role="listitem" aria-posinset={range().start + index + 1} aria-setsize={filtered().length}
        aria-label={row().label} data-kind={row().kind} data-row-id={row().id}>
        <Show when={row().oldLine !== undefined || row().newLine !== undefined}><span class="sheen-text-viewer-line-numbers" aria-hidden="true"><span>{row().oldLine ?? ""}</span><span>{row().newLine ?? ""}</span></span></Show>
        <Show when={row().prefix !== undefined}><span class="sheen-text-viewer-prefix" aria-hidden="true">{row().prefix}</span></Show>
        <span class="sheen-text-viewer-content">{highlightedText(row().text, query(), theme.state().locale)}</span>
      </div>}</Index>
      <div class="sheen-text-viewer-spacer" aria-hidden="true" style={{ "--sheen-viewer-spacer": `${range().offsetAfter}px` }} />
    </div>
  </section>;
}
