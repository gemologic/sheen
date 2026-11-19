import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

export interface DeferredModule<T> {
  readonly module: Accessor<T | undefined>;
  readonly load: () => void;
}

/**
 * Client-only overlay code split. Server and hydration renders observe no module, so callers render the
 * trigger themselves and mount the overlay body once the chunk arrives. The chunk preloads when idle after
 * hydration; `load` covers intent and queued opens. A failed load leaves the module absent, so the trigger keeps
 * working and the next intent retries instead of the preload surfacing as an unhandled rejection.
 */
export function createDeferredModule<T extends object>(loader: () => Promise<T>, enabled: Accessor<boolean>): DeferredModule<T> {
  const [module, setModule] = createSignal<T>();
  let pending: Promise<void> | undefined;
  const load = (): void => {
    if (module() !== undefined || pending !== undefined) return;
    pending = loader().then(loaded => { setModule(() => loaded); }, () => { pending = undefined; });
  };
  createEffect(() => {
    if (!enabled() || module() !== undefined) return;
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(load, { timeout: 2000 });
      onCleanup(() => cancelIdleCallback(id));
    } else {
      const id = setTimeout(load, 200);
      onCleanup(() => clearTimeout(id));
    }
  });
  return { module, load };
}
