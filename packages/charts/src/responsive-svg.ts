import { createSignal, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";

const serverWidth = 640;

interface ResponsiveSvgWidth {
  readonly ref: (element: SVGSVGElement) => void;
  readonly width: Accessor<number>;
}

export function createResponsiveSvgWidth(): ResponsiveSvgWidth {
  const [width, setWidth] = createSignal(serverWidth);
  let element: SVGSVGElement | undefined;
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;

  const measure = () => {
    frame = undefined;
    if (element === undefined) return;
    const next = Math.max(1, Math.round(element.getBoundingClientRect().width));
    setWidth(previous => previous === next ? previous : next);
  };

  onMount(() => {
    if (element === undefined) return;
    observer = new ResizeObserver(() => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    measure();
    observer.observe(element);
  });

  onCleanup(() => {
    observer?.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
  });

  return {
    ref: next => { element = next; },
    width,
  };
}
