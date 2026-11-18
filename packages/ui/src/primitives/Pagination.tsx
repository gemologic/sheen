import { For, createMemo, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { useNumberFormatter } from "../theme/intl.ts";
import { cn } from "../utils/cn.ts";
import { Glyph } from "./Glyph.tsx";

export interface PaginationProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "onChange"> {
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  pending?: boolean;
  /** Disable page requests without claiming that a request is still in progress. */
  disabled?: boolean;
  label?: string;
}

/** Controlled accepted-page state; requesting a page does not optimistically announce it. */
export function Pagination(props: PaginationProps): JSX.Element {
  const [local, others] = splitProps(props, ["pageIndex", "pageCount", "onPageChange", "pending", "disabled", "label", "class", "ref"]);
  let root: HTMLElement | undefined;
  onMount(() => {
    const element = root;
    if (!element) return;
    const document = element.ownerDocument;
    let focused: Element | undefined;
    const record = () => { focused = element.contains(document.activeElement) ? document.activeElement ?? undefined : undefined; };
    record();
    document.addEventListener("focusin", record);
    const observer = new MutationObserver(() => {
      if (!focused || element.contains(focused) || document.activeElement !== document.body || !element.isConnected) return;
      const target = element.querySelector<HTMLElement>('[aria-current="page"]') ?? element.querySelector<HTMLButtonElement>("button");
      if (target && !target.closest("[inert], [hidden]") && target.getClientRects().length) target.focus({ preventScroll: true });
    });
    observer.observe(element, { childList: true, subtree: true });
    onCleanup(() => { observer.disconnect(); document.removeEventListener("focusin", record); });
  });
  const theme = useTheme();
  const format = useNumberFormatter();
  const state = createMemo(() => {
    if (!Number.isSafeInteger(local.pageCount) || local.pageCount < 0) throw new Error("Pagination pageCount must be a nonnegative safe integer");
    if (!Number.isSafeInteger(local.pageIndex) || local.pageIndex < 0 || local.pageIndex >= Math.max(1, local.pageCount)) throw new Error("Pagination pageIndex must identify an accepted page, or zero for empty results");
    return { index: local.pageIndex, count: local.pageCount };
  });
  const pages = createMemo(() => {
    const { index, count } = state();
    const start = Math.max(0, Math.min(index - 2, count - 5));
    return Array.from({ length: Math.min(5, count) }, (_, offset) => start + offset);
  });
  const unavailable = (index: number) => local.pending || local.disabled || index < 0 || index >= state().count || index === state().index;
  const request = (index: number) => { if (!unavailable(index)) local.onPageChange(index); };
  const pageLabel = (index: number) => theme.messages().pageLabel.replaceAll("{page}", format().format(index + 1));
  const summary = () => theme.messages().pageStatus
    .replaceAll("{page}", format().format(state().count ? state().index + 1 : 0))
    .replaceAll("{pages}", format().format(state().count));
  return <nav {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-pagination", local.class)} aria-label={local.label ?? theme.messages().pagination} aria-busy={local.pending || undefined} aria-disabled={local.disabled || undefined} data-pending={local.pending ? "" : undefined}>
    <Button variant="ghost" class="sheen-pagination-step" aria-label={theme.messages().firstPage} aria-disabled={unavailable(0) || undefined} onClick={() => request(0)}><Glyph name="chevrons-left" /></Button>
    <Button variant="ghost" class="sheen-pagination-step" aria-label={theme.messages().previousPage} aria-disabled={unavailable(state().index - 1) || undefined} onClick={() => request(state().index - 1)}><Glyph name="chevron-left" /></Button>
    <For each={pages()}>{index => <Button variant="ghost" aria-label={pageLabel(index)} aria-current={index === state().index ? "page" : undefined} aria-disabled={unavailable(index) || undefined} onClick={() => request(index)}>{format().format(index + 1)}</Button>}</For>
    <Button variant="ghost" class="sheen-pagination-step" aria-label={theme.messages().nextPage} aria-disabled={unavailable(state().index + 1) || undefined} onClick={() => request(state().index + 1)}><Glyph name="chevron-right" /></Button>
    <Button variant="ghost" class="sheen-pagination-step" aria-label={theme.messages().lastPage} aria-disabled={unavailable(state().count - 1) || undefined} onClick={() => request(state().count - 1)}><Glyph name="chevrons-right" /></Button>
    <output aria-live="polite" aria-atomic="true">{summary()}</output>
  </nav>;
}
