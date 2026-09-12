// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
// src/primitives/create-size/create-size.ts
import { createEffect, createSignal, onCleanup } from "solid-js";
function createSize(ref) {
  const [height, setHeight] = createSignal(0);
  const [width, setWidth] = createSignal(0);
  createEffect(() => {
    const element = ref();
    if (!element)
      return;
    syncSize(element);
    const observer = new ResizeObserver(resizeObserverCallback);
    observer.observe(element);
    onCleanup(() => {
      observer.disconnect();
    });
  });
  const resizeObserverCallback = (entries) => {
    for (const entry of entries) {
      if (entry.target !== ref())
        continue;
      syncSize(entry.target);
    }
  };
  const syncSize = (element) => {
    setWidth(element.offsetWidth);
    setHeight(element.offsetHeight);
  };
  return {
    width,
    height
  };
}

export {
  createSize
};
