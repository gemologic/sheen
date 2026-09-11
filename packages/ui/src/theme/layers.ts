import { createSignal } from "solid-js";

export function createOverlayStack() {
  const [layers, setLayers] = createSignal<readonly string[]>([]);
  return {
    register(id: string): () => void {
      setLayers(current => current.includes(id) ? current : [...current, id]);
      return () => { setLayers(current => current.filter(item => item !== id)); };
    },
    isTop(id: string): boolean { return layers().at(-1) === id; },
    zIndex(id: string): number { return 100 + Math.max(0, layers().indexOf(id)) * 2; },
    aboveAll(): number { return 100 + layers().length * 2; },
  };
}

export type OverlayStack = ReturnType<typeof createOverlayStack>;
