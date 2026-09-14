import { useBeforeLeave, useIsRouting, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import type { NavigationAttempt, RouterAdapter, RouterLocation } from "./router.ts";

const entryKeyField = "__sheen_entry_key";

function readEntryKey(state: unknown): string | undefined {
  if (typeof state === "object" && state !== null && entryKeyField in state &&
      typeof state[entryKeyField] === "string" && state[entryKeyField].length > 0) return state[entryKeyField];
  return undefined;
}

function readDepth(state: unknown): number | undefined {
  if (typeof state === "object" && state !== null && "_depth" in state && typeof state._depth === "number" &&
      Number.isSafeInteger(state._depth) && state._depth >= 0) return state._depth;
  return undefined;
}

interface HistoryOwner {
  references: number;
  entryKey: () => string | undefined;
  dispose: () => void;
}
const historyOwners = new WeakMap<History, HistoryOwner>();

/** Share native write ownership without an extra history call for each navigation. */
function ownHistory(history: History, crypto: Crypto): { entryKey: () => string | undefined; release: () => void } {
  let owner = historyOwners.get(history);
  if (owner) owner.references++;
  else {
    const nativePush = history.pushState;
    const nativeReplace = history.replaceState;
    let disposed = false;
    const freshKey = () => `sheen-${Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, "0")).join("")}`;
    function push(this: History, state: unknown, unused: string, url?: string | URL | null) {
      if (disposed || this !== history) return nativePush.call(this, state, unused, url);
      const current: unknown = history.state;
      const depth = readDepth(current);
      // Solid Router skips its second write when depth is present. Monotonic depth survives bounded history.
      const metadata = { [entryKeyField]: freshKey(), ...(depth === undefined ? {} : { _depth: depth + 1 }) };
      nativePush.call(this, Object.assign({}, state, metadata), unused, url);
    }
    function replace(this: History, state: unknown, unused: string, url?: string | URL | null) {
      if (disposed || this !== history) return nativeReplace.call(this, state, unused, url);
      const current: unknown = history.state;
      const depth = readDepth(current);
      const metadata = { [entryKeyField]: readEntryKey(current) ?? freshKey(), ...(depth === undefined ? {} : { _depth: depth }) };
      nativeReplace.call(this, Object.assign({}, state, metadata), unused, url);
    }
    history.pushState = push;
    history.replaceState = replace;
    owner = {
      references: 1,
      entryKey() {
        const state: unknown = history.state;
        const key = readEntryKey(state);
        if (key !== undefined) return key;
        if (typeof state !== "object" || state === null) return undefined;
        history.replaceState(state, "");
        return readEntryKey(history.state);
      },
      dispose() {
        disposed = true;
        if (history.pushState === push) history.pushState = nativePush;
        if (history.replaceState === replace) history.replaceState = nativeReplace;
        historyOwners.delete(history);
      },
    };
    historyOwners.set(history, owner);
  }
  const acquired = owner;
  let released = false;
  return { entryKey: acquired.entryKey, release() {
    if (released) return;
    released = true;
    if (--acquired.references === 0) acquired.dispose();
  } };
}

/**
 * Adapts the owning Solid Router context to Sheen's router-independent shell
 * contract. Call this inside Router, then pass the result to AppShell and any
 * URL-state helpers that must share navigation ownership.
 */
export function useSolidRouterAdapter(): RouterAdapter {
  const location = useLocation();
  const navigate = useNavigate();
  const routing = useIsRouting();
  const [committed, setCommitted] = createSignal<RouterLocation>(
    { pathname: location.pathname, search: location.search, hash: location.hash },
    { equals: (previous, next) => previous.entryKey === next.entryKey && previous.pathname === next.pathname &&
      previous.search === next.search && previous.hash === next.hash },
  );
  onMount(() => {
    const history = ownHistory(window.history, window.crypto);
    onCleanup(history.release);
    createEffect(on([() => location.pathname, () => location.search, () => location.hash, () => location.state, routing], () => {
      if (routing()) return;
      const key = history.entryKey();
      setCommitted({ pathname: location.pathname, search: location.search, hash: location.hash, ...(key === undefined ? {} : { entryKey: key }) });
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
    location: committed,
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
