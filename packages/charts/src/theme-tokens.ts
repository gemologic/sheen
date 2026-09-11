import { createEffect, createSignal, onCleanup } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import { useTheme } from "@gemologic/sheen";

export type ThemeTokenName = `--sheen-${string}`;
export type ThemeTokenValues = Readonly<Record<string, string>>;

interface TokenSubscription {
  readonly names: readonly ThemeTokenName[];
  readonly publish: Setter<ThemeTokenValues>;
  current?: ThemeTokenValues;
}

interface TokenBridge {
  readonly schedule: () => void;
  readonly subscribe: (subscription: TokenSubscription) => () => void;
}

const emptyValues: ThemeTokenValues = Object.freeze({});
const bridges = new WeakMap<HTMLElement, TokenBridge>();
const liveBridges = new Set<TokenBridge>();

function isThemeTokenName(value: unknown): value is ThemeTokenName {
  return typeof value === "string" && /^--sheen-[a-z0-9-]+$/u.test(value);
}

function validateNames(names: readonly ThemeTokenName[]): readonly ThemeTokenName[] {
  if (!Array.isArray(names) || names.length === 0) throw new Error("useThemeTokens requires at least one token name");
  const unique = new Set<ThemeTokenName>();
  for (const name of names) {
    if (!isThemeTokenName(name)) throw new Error(`Invalid sheen token name: ${String(name)}`);
    unique.add(name);
  }
  return Object.freeze([...unique]);
}

function createTokenBridge(element: HTMLElement): TokenBridge {
  const view = element.ownerDocument.defaultView;
  if (!view) throw new Error("Theme token probes require a browser window");
  const browser: Window = view;
  const probe = element.ownerDocument.createElement("span");
  probe.hidden = true;
  probe.setAttribute("aria-hidden", "true");
  probe.setAttribute("data-sheen-theme-token-probe", "");
  const probeParent = element === element.ownerDocument.documentElement ? element.ownerDocument.body : element;
  probeParent.append(probe);
  const subscriptions = new Set<TokenSubscription>();
  let frame: number | undefined;

  function read(): void {
    frame = undefined;
    if (subscriptions.size === 0) return;
    const computed = browser.getComputedStyle(probe);
    const resolved: Record<string, string> = {};
    for (const subscription of subscriptions) {
      for (const name of subscription.names) resolved[name] = computed.getPropertyValue(name).trim();
    }
    for (const subscription of subscriptions) {
      const values: Record<string, string> = {};
      let changed = subscription.current === undefined;
      for (const name of subscription.names) {
        values[name] = resolved[name] ?? "";
        if (subscription.current?.[name] !== values[name]) changed = true;
      }
      if (changed) {
        subscription.current = Object.freeze(values);
        subscription.publish(subscription.current);
      }
    }
  }

  function schedule(): void {
    if (frame === undefined) frame = browser.requestAnimationFrame(read);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(element.ownerDocument.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: [
      "data-sheen-theme", "data-sheen-mode", "data-sheen-accent", "data-sheen-density",
      "data-sheen-radius", "data-sheen-motion", "data-sheen-direction",
    ],
  });

  const bridge: TokenBridge = {
    schedule,
    subscribe(subscription) {
      subscriptions.add(subscription);
      schedule();
      return () => {
        subscriptions.delete(subscription);
        if (subscriptions.size !== 0) return;
        if (frame !== undefined) browser.cancelAnimationFrame(frame);
        observer.disconnect();
        probe.remove();
        liveBridges.delete(bridge);
        bridges.delete(element);
      };
    },
  };
  bridges.set(element, bridge);
  liveBridges.add(bridge);
  return bridge;
}

function bridgeFor(element: HTMLElement): TokenBridge {
  return bridges.get(element) ?? createTokenBridge(element);
}

export function useThemeTokens(names: readonly ThemeTokenName[]): Accessor<ThemeTokenValues> {
  const requested = validateNames(names);
  const theme = useTheme();
  const [values, setValues] = createSignal<ThemeTokenValues>(emptyValues);
  let target: HTMLElement | undefined;
  let release: (() => void) | undefined;

  createEffect(() => {
    theme.state();
    theme.resolvedMode();
    const tokenTarget = theme.tokenTarget();
    if (tokenTarget && tokenTarget !== target) {
      release?.();
      target = tokenTarget;
      release = bridgeFor(tokenTarget).subscribe({ names: requested, publish: setValues });
    }
    if (tokenTarget) bridges.get(tokenTarget)?.schedule();
  });

  onCleanup(() => release?.());
  return values;
}

export function invalidateThemeTokens(): void {
  for (const bridge of liveBridges) bridge.schedule();
}
