import { For, Show, createEffect, createMemo, createSignal, on, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useNumberFormatter } from "../theme/intl.ts";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children"> {
  label: string;
  src?: string;
  fallback?: string;
  size?: AvatarSize;
}

function avatarFallback(label: string, explicit: string | undefined): string {
  if (explicit !== undefined) {
    if (!explicit.trim()) throw new Error("Avatar fallback must be nonempty when supplied");
    return explicit;
  }
  return label.trim().split(/\s+/u).slice(0, 2).map(part => Array.from(part)[0] ?? "").join("").toUpperCase();
}

export function Avatar(props: AvatarProps): JSX.Element {
  const [local, forwarded] = splitProps(props, ["label", "src", "fallback", "size", "class"]);
  if (!local.label?.trim()) throw new Error("Avatar requires a nonempty label");
  const size = (): AvatarSize => {
    const value = local.size ?? "md";
    if (value !== "sm" && value !== "md" && value !== "lg") throw new Error("Avatar size is invalid");
    return value;
  };
  const [failed, setFailed] = createSignal(false);
  let image: HTMLImageElement | undefined;
  createEffect(on(() => local.src, () => setFailed(false), { defer: true }));
  onMount(() => {
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  });
  const fallback = createMemo(() => avatarFallback(local.label, local.fallback));
  return <span {...forwarded} class={cn("sheen-avatar", local.class)} role="img" aria-label={local.label} data-size={size()}>
    <span class="sheen-avatar-fallback" aria-hidden="true">{fallback()}</span>
    <Show when={local.src && !failed()}>
      <img ref={image} class="sheen-avatar-image" src={local.src} alt="" draggable={false} onError={() => setFailed(true)} />
    </Show>
  </span>;
}

export interface AvatarItem {
  readonly id: string;
  readonly label: string;
  readonly src?: string;
  readonly fallback?: string;
}

export interface AvatarGroupProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  avatars: readonly AvatarItem[];
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup(props: AvatarGroupProps): JSX.Element {
  const [local, forwarded] = splitProps(props, ["label", "avatars", "max", "size", "class"]);
  if (!local.label?.trim()) throw new Error("AvatarGroup requires a nonempty label");
  const theme = useTheme();
  const formatter = useNumberFormatter();
  const items = createMemo(() => {
    const ids = new Set<string>();
    for (const item of local.avatars) {
      if (!item.id?.trim() || ids.has(item.id)) throw new Error("AvatarGroup IDs must be unique nonempty strings");
      ids.add(item.id);
    }
    return local.avatars;
  });
  const maximum = (): number => {
    const value = local.max ?? 5;
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error("AvatarGroup max must be a positive safe integer");
    return value;
  };
  const visible = createMemo(() => items().slice(0, maximum()));
  const hidden = createMemo(() => Math.max(0, items().length - visible().length));
  return <div {...forwarded} class={cn("sheen-avatar-group", local.class)} role="group" aria-label={local.label}>
    <For each={visible()}>{item => <Avatar label={item.label} {...(item.src === undefined ? {} : { src: item.src })} {...(item.fallback === undefined ? {} : { fallback: item.fallback })} {...(local.size === undefined ? {} : { size: local.size })} />}</For>
    <Show when={hidden()}>{count => <span class="sheen-avatar sheen-avatar-overflow" data-size={local.size ?? "md"} aria-label={theme.messages().avatarOverflow.replaceAll("{count}", formatter().format(count()))}>+{formatter().format(count())}</span>}</Show>
  </div>;
}
