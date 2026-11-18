import { createSignal, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";
import { breakpointQuery } from "@gemologic/sheen-tokens/catalog";
import type { BreakpointName } from "@gemologic/sheen-tokens/catalog";

/**
 * Tracks a media query. Server markup and the first client frame use `serverValue`, so hydration stays
 * deterministic; the live value applies after mount. Use it for behavior (drawer versus persistent panel),
 * never to hide content: CSS owns layout.
 */
export function createMediaQuery(query: string, serverValue = false): Accessor<boolean> {
  const [matches, setMatches] = createSignal(serverValue);
  onMount(() => {
    const media = window.matchMedia(query);
    const update = (): void => { setMatches(media.matches); };
    update();
    media.addEventListener("change", update);
    onCleanup(() => media.removeEventListener("change", update));
  });
  return matches;
}

/** `up` matches at and above the breakpoint, `down` strictly below it. */
export function useBreakpoint(name: BreakpointName, direction: "up" | "down" = "up", serverValue = false): Accessor<boolean> {
  return createMediaQuery(breakpointQuery(name, direction), serverValue);
}
