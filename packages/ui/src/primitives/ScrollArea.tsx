import { Show, createEffect, createMemo, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface ScrollAreaProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  orientation?: "vertical" | "horizontal" | "both";
}

export function ScrollArea(props: ScrollAreaProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "orientation", "class", "onScroll", "ref", "children"]);
  let viewport: HTMLDivElement | undefined;
  let content: HTMLDivElement | undefined;
  let frame: number | undefined;
  const [metrics, setMetrics] = createSignal({ x: 0, y: 0, width: 0, height: 0, scrollWidth: 0, scrollHeight: 0, left: 0, top: 0, rtl: false });
  const [dragging, setDragging] = createSignal(false);
  const measure = () => {
    frame = undefined;
    if (!viewport) return;
    setMetrics({ x: viewport.offsetLeft + viewport.clientLeft, y: viewport.offsetTop + viewport.clientTop, width: viewport.clientWidth, height: viewport.clientHeight, scrollWidth: viewport.scrollWidth, scrollHeight: viewport.scrollHeight, left: Math.abs(viewport.scrollLeft), top: viewport.scrollTop, rtl: viewport.matches(":dir(rtl)") });
  };
  const schedule = () => { if (frame === undefined) frame = viewport?.ownerDocument.defaultView?.requestAnimationFrame(measure); };
  const vertical = () => local.orientation !== "horizontal" && metrics().scrollHeight > metrics().height;
  const horizontal = () => (local.orientation === "horizontal" || local.orientation === "both") && metrics().scrollWidth > metrics().width;
  const geometry = (axis: "x" | "y") => {
    const data = metrics();
    const visible = axis === "y" ? data.height : data.width;
    const total = axis === "y" ? data.scrollHeight : data.scrollWidth;
    const length = Math.max(0, visible - ((axis === "y" ? horizontal() : vertical()) ? 8 : 0));
    const size = Math.min(length, Math.max(20, total > 0 ? visible / total * length : length));
    const maximum = Math.max(0, total - visible);
    const position = axis === "y" ? data.top : data.left;
    const fraction = maximum > 0 ? Math.min(1, Math.max(0, position / maximum)) : 0;
    return { length, size, maximum, travel: length - size, offset: (axis === "x" && data.rtl ? 1 - fraction : fraction) * (length - size) };
  };
  const coordinate = (event: PointerEvent, track: HTMLDivElement, axis: "x" | "y") => {
    const bounds = track.getBoundingClientRect();
    const rendered = axis === "y" ? bounds.height : bounds.width;
    const length = axis === "y" ? track.clientHeight : track.clientWidth;
    const delta = axis === "y" ? event.clientY - bounds.top : event.clientX - bounds.left;
    return rendered > 0 ? delta * length / rendered : 0;
  };
  let drag: { pointer: number; axis: "x" | "y"; grab: number; track: HTMLDivElement } | undefined;
  const move = (event: PointerEvent, track: HTMLDivElement) => {
    if (!drag || !viewport || event.pointerId !== drag.pointer) return;
    const data = geometry(drag.axis);
    const point = coordinate(event, track, drag.axis);
    let fraction = data.travel > 0 ? Math.min(1, Math.max(0, (point - drag.grab) / data.travel)) : 0;
    if (drag.axis === "x" && metrics().rtl) fraction = 1 - fraction;
    if (drag.axis === "y") viewport.scrollTop = fraction * data.maximum;
    else viewport.scrollLeft = fraction * data.maximum * (metrics().rtl ? -1 : 1);
    schedule();
  };
  const start = (axis: "x" | "y", event: PointerEvent & { currentTarget: HTMLDivElement }) => {
    if (event.button !== 0 || !viewport || drag) return;
    event.preventDefault();
    const data = geometry(axis);
    const point = coordinate(event, event.currentTarget, axis);
    drag = { pointer: event.pointerId, axis, grab: event.target === event.currentTarget ? data.size / 2 : point - data.offset, track: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    move(event, event.currentTarget);
  };
  const stop = () => {
    const previous = drag;
    drag = undefined;
    setDragging(false);
    if (previous?.track.hasPointerCapture(previous.pointer)) previous.track.releasePointerCapture(previous.pointer);
  };
  const finish = (event: PointerEvent) => { if (event.pointerId === drag?.pointer) stop(); };
  createEffect(() => {
    if (dragging() && drag && !(drag.axis === "y" ? vertical() : horizontal())) stop();
  });
  onMount(() => {
    measure();
    const observer = new ResizeObserver(schedule);
    if (viewport) observer.observe(viewport);
    if (viewport?.parentElement) observer.observe(viewport.parentElement);
    if (content) observer.observe(content);
    const attributes = new MutationObserver(schedule);
    let ancestor: HTMLElement | null | undefined = viewport;
    while (ancestor) {
      attributes.observe(ancestor, { attributes: true, attributeFilter: ["dir", "data-sheen-direction", "data-orientation", "class", "style"] });
      ancestor = ancestor.parentElement;
    }
    onCleanup(() => { observer.disconnect(); attributes.disconnect(); });
  });
  const [scrolling, setScrolling] = createSignal(false);
  let idle: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => { stop(); if (idle !== undefined) clearTimeout(idle); if (frame !== undefined) viewport?.ownerDocument.defaultView?.cancelAnimationFrame(frame); });
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("ScrollArea requires a nonempty accessible label");
    return local.label;
  });
  const onScroll: JSX.EventHandler<HTMLDivElement, Event> = event => {
    schedule();
    setScrolling(true);
    if (idle !== undefined) clearTimeout(idle);
    idle = setTimeout(() => { idle = undefined; setScrolling(false); }, 800);
    const handler = local.onScroll;
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
  };
  return <div class="sheen-scroll-frame" dir={others.dir} data-scrolling={scrolling() || dragging() || undefined} data-both={vertical() && horizontal() || undefined}>
    <div role="region" {...others} ref={element => { viewport = element; if (typeof local.ref === "function") local.ref(element); }} aria-label={label()} tabIndex={others.tabIndex ?? 0} class={cn("sheen-scroll-area", local.class)} data-orientation={local.orientation ?? "vertical"} data-scrolling={scrolling() || undefined} onScroll={onScroll}>
      <div ref={content} class="sheen-scroll-content">{local.children}</div>
    </div>
    <Show when={vertical()}><div aria-hidden="true" class="sheen-scroll-track" data-axis="y" style={{ left: `${metrics().x + (metrics().rtl ? 0 : metrics().width - 8)}px`, top: `${metrics().y}px`, height: `${geometry("y").length}px` }} onPointerDown={event => start("y", event)} onPointerMove={event => move(event, event.currentTarget)} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
      <div class="sheen-scroll-thumb" style={{ height: `${geometry("y").size}px`, transform: `translateY(${geometry("y").offset}px)` }} />
    </div></Show>
    <Show when={horizontal()}><div aria-hidden="true" class="sheen-scroll-track" data-axis="x" style={{ left: `${metrics().x + (metrics().rtl && vertical() ? 8 : 0)}px`, top: `${metrics().y + metrics().height - 8}px`, width: `${geometry("x").length}px` }} onPointerDown={event => start("x", event)} onPointerMove={event => move(event, event.currentTarget)} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
      <div class="sheen-scroll-thumb" style={{ width: `${geometry("x").size}px`, transform: `translateX(${geometry("x").offset}px)` }} />
    </div></Show>
  </div>;
}
