import { Show, createSignal, getOwner, onCleanup } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

export interface ConfirmOptions {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly tone?: "accent" | "danger";
  readonly signal?: AbortSignal;
}
interface Request {
  readonly options: ConfirmOptions;
  readonly opener: HTMLElement | undefined;
  readonly open: Accessor<boolean>;
  readonly settle: (result: boolean) => void;
}
export interface ConfirmController {
  readonly confirm: (options: ConfirmOptions) => Promise<boolean>;
  readonly Dialog: () => JSX.Element;
}

/** Create inside a Solid owner and mount Dialog once within that owner's theme scope. */
export function createConfirm(): ConfirmController {
  if (!getOwner()) throw new Error("createConfirm requires a Solid owner");
  let disposed = false;
  const [request, setRequest] = createSignal<Request>();
  onCleanup(() => { disposed = true; request()?.settle(false); });
  function confirm(options: ConfirmOptions): Promise<boolean> {
    if (disposed || options.signal?.aborted) return Promise.resolve(false);
    if (request()?.open()) return Promise.reject(new Error("createConfirm already has an unanswered request"));
    const snapshot = { ...options };
    const active = typeof document === "undefined" ? undefined : document.activeElement;
    const opener = typeof HTMLElement !== "undefined" && active instanceof HTMLElement ? active : undefined;
    return new Promise(resolve => {
      const [open, setOpen] = createSignal(true);
      let settled = false;
      const abort = () => settle(false);
      const settle = (result: boolean) => {
        if (settled) return;
        settled = true;
        snapshot.signal?.removeEventListener("abort", abort);
        setOpen(false);
        resolve(result);
      };
      snapshot.signal?.addEventListener("abort", abort, { once: true });
      setRequest({ options: snapshot, opener, open, settle });
    });
  }
  function Dialog(): JSX.Element {
    return <Show when={request()} keyed>{current => <ConfirmDialog {...current.options} open={current.open()}
      returnFocus={() => current.opener} onConfirm={() => current.settle(true)} onCancel={() => current.settle(false)} />}</Show>;
  }
  return { confirm, Dialog };
}
