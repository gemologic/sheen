import { createEffect, createMemo, createSignal, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { iconLoaders } from "./generated/loaders.ts";
import { IconGlyph } from "./glyph.tsx";
import type { IconGlyphState } from "./glyph.tsx";
import type { IconName } from "./registry.ts";
import type { IconData, StaticIconProps } from "./runtime.tsx";

export type LazyIconProps = StaticIconProps & {
  /** Semantic name received at runtime. Unknown names render a visible, sized marker instead of throwing. */
  readonly name: string;
};

/** Glyphs resolved through preloadIcons or a completed client load. Module identity already caches the imports; this keeps the results synchronously readable. */
const resolved = new Map<IconName, readonly IconData[]>();
const pending = new Map<IconName, Promise<readonly IconData[]>>();

/** Validates against the loader keys, so the check costs no registry data and ignores inherited names such as `constructor`. */
export function isLazyIconName(name: string): name is IconName {
  return Object.hasOwn(iconLoaders, name);
}

function loadIcon(name: IconName): Promise<readonly IconData[]> {
  const known = resolved.get(name);
  if (known) return Promise.resolve(known);
  const inFlight = pending.get(name);
  if (inFlight) return inFlight;
  const request = iconLoaders[name]().then(module => {
    resolved.set(name, module.glyphs);
    return module.glyphs;
  }).finally(() => pending.delete(name));
  pending.set(name, request);
  return request;
}

/**
 * Resolves runtime names before rendering, so server markup and the hydrating client both emit the glyph.
 * Preload the same names on both sides; unknown names are skipped because LazyIcon renders them as unknown either way.
 */
export async function preloadIcons(names: Iterable<string>): Promise<void> {
  const known = [...new Set(names)].filter(isLazyIconName);
  await Promise.all(known.map(loadIcon));
}

interface LazyIconView { readonly state: IconGlyphState | undefined; readonly icons: readonly IconData[] }

const empty: readonly IconData[] = Object.freeze([]);

/**
 * Loads one semantic icon by runtime name through a per-icon dynamic import instead of retaining the registry.
 * The server renders a sized placeholder unless the name was preloaded; the client fills the same root after mount.
 */
export function LazyIcon(props: LazyIconProps): JSX.Element {
  const [local, others] = splitProps(props, ["name"]);
  const [revision, setRevision] = createSignal(0);
  const [failed, setFailed] = createSignal<string>();
  const view = createMemo<LazyIconView>(() => {
    revision();
    const name = local.name;
    if (!isLazyIconName(name)) return { state: "unknown", icons: empty };
    const icons = resolved.get(name);
    if (icons) return { state: undefined, icons };
    return { state: failed() === name ? "error" : "loading", icons: empty };
  });
  if (!isServer) {
    let disposed = false;
    onCleanup(() => { disposed = true; });
    createEffect(() => {
      const name = local.name;
      if (!isLazyIconName(name) || resolved.has(name)) return;
      // The view derives from the current name, so a late result for a replaced name only refreshes the cache.
      loadIcon(name).then(() => { if (!disposed) setRevision(value => value + 1); }, () => { if (!disposed) setFailed(name); });
    });
  }
  return <IconGlyph {...others} name={local.name} icons={view().icons} state={view().state} />;
}
