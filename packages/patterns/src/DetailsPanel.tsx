import { Button, Heading } from "@gemologic/sheen";
import { children, createEffect, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export interface DetailsPanelProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  readonly panelId: string;
  readonly title: string;
  readonly open: boolean;
  readonly presentation?: "docked" | "sheet";
  readonly onOpenChange: (open: boolean) => void;
  readonly returnFocus?: () => HTMLElement | undefined;
  readonly resizable?: boolean;
  readonly width?: number;
  readonly defaultWidth?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly onWidthChange?: (width: number) => void;
  readonly closeLabel?: string;
  readonly children: JSX.Element;
}

function finiteWidth(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`DetailsPanel ${name} must be a positive finite number`);
  return value;
}

export function DetailsPanel(props: DetailsPanelProps): JSX.Element {
  const [local, rest] = splitProps(props, ["panelId", "title", "open", "presentation", "onOpenChange", "returnFocus", "resizable", "width", "defaultWidth", "minWidth", "maxWidth", "onWidthChange", "closeLabel", "children", "class", "ref", "style"]);
  const content = children(() => local.children);
  const [draftWidth, setDraftWidth] = createSignal(local.defaultWidth ?? 360);
  const minimum = () => finiteWidth(local.minWidth ?? 280, "minWidth");
  const maximum = () => finiteWidth(local.maxWidth ?? 640, "maxWidth");
  const width = () => {
    const min = minimum();
    const max = maximum();
    if (min > max) throw new Error("DetailsPanel minWidth cannot exceed maxWidth");
    return Math.min(max, Math.max(min, finiteWidth(local.width ?? draftWidth(), "width")));
  };
  const presentation = () => local.presentation ?? "docked";
  const title = createMemo(() => {
    if (!local.panelId.trim() || !local.title.trim()) throw new Error("DetailsPanel requires nonempty panelId and title");
    return local.title;
  });
  const changeWidth = (next: number): void => {
    const accepted = Math.min(maximum(), Math.max(minimum(), next));
    if (local.width === undefined) setDraftWidth(accepted);
    local.onWidthChange?.(accepted);
  };
  let panel: HTMLElement | undefined;
  let close: HTMLButtonElement | undefined;
  let opener: HTMLElement | undefined;
  let finishResize: (() => void) | undefined;
  let wasOpen = false;
  onMount(() => {
    createEffect(() => {
      const open = local.open;
      if (open && !wasOpen) {
        const active = document.activeElement;
        opener = active instanceof HTMLElement ? active : undefined;
      }
      if (open && presentation() === "sheet") queueMicrotask(() => close?.focus({ preventScroll: true }));
      if (!open && wasOpen) queueMicrotask(() => (local.returnFocus?.() ?? opener)?.focus({ preventScroll: true }));
      wasOpen = open;
    });
  });
  onCleanup(() => finishResize?.());
  const keydown = (event: KeyboardEvent): void => {
    if (!local.open || presentation() !== "sheet") return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      local.onOpenChange(false);
      return;
    }
    if (event.key !== "Tab" || !panel) return;
    const controls = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.closest("[hidden], [inert]") && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) { event.preventDefault(); panel.focus({ preventScroll: true }); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const beginResize = (event: PointerEvent): void => {
    if (!local.resizable || presentation() !== "docked") return;
    event.preventDefault();
    const origin = event.clientX;
    const initial = width();
    const direction = panel?.ownerDocument.documentElement.dir === "rtl" ? 1 : -1;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    finishResize?.();
    target.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) => changeWidth(initial + (next.clientX - origin) * direction);
    const finish = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
      if (finishResize === finish) finishResize = undefined;
    };
    finishResize = finish;
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  };
  const resizeKey = (event: KeyboardEvent): void => {
    const rtl = panel?.ownerDocument.documentElement.dir === "rtl";
    if (event.key === "Home") changeWidth(minimum());
    else if (event.key === "End") changeWidth(maximum());
    else if (event.key === "ArrowLeft") changeWidth(width() + (rtl ? 16 : -16));
    else if (event.key === "ArrowRight") changeWidth(width() + (rtl ? -16 : 16));
    else return;
    event.preventDefault();
  };
  const style = () => typeof local.style === "string" ? `${local.style};--sheen-admin-details-width:${width()}px` : { ...local.style, "--sheen-admin-details-width": `${width()}px` };
  return <div {...rest} ref={local.ref} class={`sheen-admin-details-owner ${local.class ?? ""}`} data-open={local.open || undefined} data-presentation={presentation()} style={style()}>
    <button class="sheen-admin-details-backdrop" type="button" aria-label={local.closeLabel ?? "Close details"} tabIndex={-1} hidden={!local.open || presentation() !== "sheet"} onClick={() => local.onOpenChange(false)} />
    <aside ref={panel} class="sheen-admin-details" id={local.panelId} role={presentation() === "sheet" ? "dialog" : "complementary"}
      aria-modal={presentation() === "sheet" ? "true" : undefined} aria-label={title()} hidden={!local.open} inert={!local.open} tabIndex={-1} onKeyDown={keydown}>
      <ShowResize when={Boolean(local.resizable) && presentation() === "docked"} width={width()} minimum={minimum()} maximum={maximum()} onPointerDown={beginResize} onKeyDown={resizeKey} />
      <header class="sheen-admin-details-header"><Heading level={2} size="h3">{title()}</Heading><Button ref={close} aria-label={local.closeLabel ?? "Close details"} onClick={() => local.onOpenChange(false)}>×</Button></header>
      <div class="sheen-admin-details-content">{content()}</div>
    </aside>
  </div>;
}

function ShowResize(props: { readonly when: boolean; readonly width: number; readonly minimum: number; readonly maximum: number; readonly onPointerDown: (event: PointerEvent) => void; readonly onKeyDown: (event: KeyboardEvent) => void }): JSX.Element {
  return props.when ? <div class="sheen-admin-details-resize" role="separator" aria-label="Resize details panel" aria-orientation="vertical"
    aria-valuemin={props.minimum} aria-valuemax={props.maximum} aria-valuenow={Math.round(props.width)} tabIndex={0}
    onPointerDown={props.onPointerDown} onKeyDown={props.onKeyDown}><span aria-hidden="true" /></div> : null;
}
