import { useRouter, type HistoryLocation, type RouterHistory } from "@tanstack/solid-router";
import { createSignal, getOwner, onCleanup } from "solid-js";
import type { NavigationAttempt, NavigationOptions, RouterAdapter, RouterLocation } from "./router.ts";

type HistoryAction = "PUSH" | "REPLACE" | "FORWARD" | "BACK" | "GO";

function routerLocation(location: HistoryLocation): RouterLocation {
  const entryKey = location.state.__TSR_key ?? location.state.key;
  return {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    ...(entryKey === undefined ? {} : { entryKey }),
  };
}

function stateValue(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("TanStack Router navigation state must be an object");
  return Object.fromEntries(Object.entries(value));
}

function traversalDelta(action: HistoryAction, current: HistoryLocation, next: HistoryLocation): number {
  const delta = next.state.__TSR_index - current.state.__TSR_index;
  if (Number.isSafeInteger(delta) && delta !== 0) return delta;
  if (action === "BACK") return -1;
  if (action === "FORWARD") return 1;
  throw new Error("TanStack Router did not provide a usable history traversal index");
}

function replay(history: RouterHistory, action: HistoryAction, current: HistoryLocation, next: HistoryLocation): void {
  if (action === "PUSH") history.push(next.href, next.state);
  else if (action === "REPLACE") history.replace(next.href, next.state);
  else history.go(traversalDelta(action, current, next));
}

/**
 * Adapts an owned TanStack history instance to Sheen's router-independent contract.
 * Call inside a Solid owner so subscriptions and blockers are disposed with the app.
 */
export function createTanStackRouterAdapter(history: RouterHistory): RouterAdapter {
  if (!getOwner()) throw new Error("createTanStackRouterAdapter requires an owned Solid context");
  const [location, setLocation] = createSignal(routerLocation(history.location));
  const registrations = new Set<{ readonly listener: (attempt: NavigationAttempt) => void }>();
  const bypass = new Map<object, string>();
  let disposed = false;
  const stopLocation = history.subscribe(event => setLocation(routerLocation(event.location)));
  const stopBlocker = history.block({
    enableBeforeUnload: () => registrations.size > 0,
    blockerFn: event => {
      let prevented = false;
      const attemptKey = `${event.action}:${event.nextLocation.href}:${event.nextLocation.state.__TSR_index}`;
      for (const registration of [...registrations]) {
        if (!registrations.has(registration)) continue;
        if (bypass.get(registration) === attemptKey) {
          bypass.delete(registration);
          continue;
        }
        let retried = false;
        const to = event.action === "PUSH" || event.action === "REPLACE"
          ? event.nextLocation.href
          : traversalDelta(event.action, event.currentLocation, event.nextLocation);
        registration.listener({
          to,
          get defaultPrevented() { return prevented; },
          preventDefault: () => { prevented = true; },
          retry: () => {
            if (disposed || retried || !registrations.has(registration)) return;
            retried = true;
            queueMicrotask(() => {
              if (!disposed && registrations.has(registration)) {
                bypass.set(registration, attemptKey);
                replay(history, event.action, event.currentLocation, event.nextLocation);
              }
            });
          },
        });
      }
      return prevented;
    },
  });
  onCleanup(() => {
    disposed = true;
    registrations.clear();
    bypass.clear();
    stopBlocker();
    stopLocation();
  });
  return {
    location,
    navigate(to: string | number, options?: NavigationOptions): void {
      if (disposed) throw new Error("Cannot navigate with a disposed router adapter");
      if (typeof to === "number") history.go(to);
      else if (options?.replace) history.replace(to, stateValue(options.state));
      else history.push(to, stateValue(options?.state));
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

/** Call inside TanStack RouterContextProvider or RouterProvider. */
export function useTanStackRouterAdapter(): RouterAdapter {
  return createTanStackRouterAdapter(useRouter().history);
}
