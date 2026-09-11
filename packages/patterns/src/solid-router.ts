import { useBeforeLeave, useIsRouting, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import type { NavigationAttempt, RouterAdapter } from "./router.ts";

/**
 * Adapts the owning Solid Router context to Sheen's router-independent shell
 * contract. Call this inside Router, then pass the result to AppShell and any
 * URL-state helpers that must share navigation ownership.
 */
export function useSolidRouterAdapter(): RouterAdapter {
  const location = useLocation();
  const navigate = useNavigate();
  const routing = useIsRouting();
  const [entryKey, setEntryKey] = createSignal<string>();
  const entries = new Map<number, string>();
  let generation = 0;
  let intent: "push" | "replace" | "traverse" | undefined;

  onMount(() => {
    createEffect(on([() => location.pathname, () => location.search, () => location.hash, () => location.state, routing], () => {
      if (routing()) return;
      const state: unknown = window.history.state;
      const depth = typeof state === "object" && state !== null && "_depth" in state && typeof state._depth === "number" ? state._depth : undefined;
      if (depth === undefined || !Number.isSafeInteger(depth) || depth < 0) {
        setEntryKey(undefined);
        intent = undefined;
        return;
      }
      if (intent === "push") for (const known of entries.keys()) if (known >= depth) entries.delete(known);
      const key = entries.get(depth) ?? `entry-${++generation}`;
      entries.delete(depth);
      entries.set(depth, key);
      if (entries.size > 256) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      setEntryKey(key);
      intent = undefined;
    }));
  });

  const registrations = new Set<{ listener: (attempt: NavigationAttempt) => void }>();
  const bypass = new Map<object, string | number>();
  let disposed = false;
  onCleanup(() => {
    disposed = true;
    registrations.clear();
    bypass.clear();
  });
  useBeforeLeave(event => {
    intent = typeof event.to === "number" ? "traverse" : event.options?.replace ? "replace" : "push";
    for (const registration of [...registrations]) {
      if (!registrations.has(registration)) continue;
      if (bypass.has(registration)) {
        const destination = bypass.get(registration);
        bypass.delete(registration);
        if (destination === event.to) continue;
      }
      let retried = false;
      registration.listener({
        to: event.to,
        get defaultPrevented() { return event.defaultPrevented; },
        preventDefault: event.preventDefault,
        retry() {
          if (disposed || retried || !registrations.has(registration)) return;
          retried = true;
          bypass.set(registration, event.to);
          try {
            event.retry();
          } catch (error) {
            bypass.delete(registration);
            throw error;
          } finally {
            // String navigation dispatches synchronously; traversal dispatches on popstate.
            if (typeof event.to === "string") bypass.delete(registration);
          }
        },
      });
    }
  });

  return {
    location: () => {
      const key = entryKey();
      return { pathname: location.pathname, search: location.search, hash: location.hash, ...(key === undefined ? {} : { entryKey: key }) };
    },
    navigate: (to, options) => {
      if (typeof to === "number") navigate(to);
      else navigate(to, options);
    },
    block(listener) {
      if (disposed) throw new Error("Cannot register a blocker on a disposed router adapter");
      const registration = { listener };
      registrations.add(registration);
      return () => {
        registrations.delete(registration);
        bypass.delete(registration);
      };
    },
  };
}
