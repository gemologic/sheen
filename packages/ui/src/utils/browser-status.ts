import { createSignal, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";

/** Browser connectivity hint, not backend health. Undefined until client mount. */
export function useOnlineStatus(): Accessor<boolean | undefined> {
  const [online, setOnline] = createSignal<boolean>();
  onMount(() => {
    const update = () => setOnline(window.navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    onCleanup(() => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    });
  });
  return online;
}

/** Document focus, not merely an active element. Undefined until client mount. */
export function useIsWindowFocused(): Accessor<boolean | undefined> {
  const [focused, setFocused] = createSignal<boolean>();
  onMount(() => {
    const update = () => setFocused(document.hasFocus());
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    update();
    onCleanup(() => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    });
  });
  return focused;
}
