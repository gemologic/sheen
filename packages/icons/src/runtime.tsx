import { For, createMemo, splitProps } from "solid-js";
import type { Component, JSX } from "solid-js";
import { iconData } from "./generated/catalog.ts";
import { isIconName } from "./registry.ts";
import type { IconName, IconSetName } from "./registry.ts";

export interface IconData {
  readonly set: IconSetName;
  readonly body: string;
  readonly width: number;
  readonly height: number;
}

interface IconVisualProps extends Pick<JSX.HTMLAttributes<HTMLSpanElement>, "id" | "class" | "style"> {
  readonly size?: "sm" | "md" | "lg";
  readonly tone?: "muted" | "inherit";
}

export interface StaticIconProps extends IconVisualProps {
  /** Defaults to true. Meaningful icons set false and require label at runtime and through the recommended lint rule. */
  readonly decorative?: boolean;
  readonly label?: string;
}
export type IconProps = StaticIconProps & { readonly name: IconName };
export type DynamicIconProps = StaticIconProps & { readonly name: string };

type IconGlyphProps = StaticIconProps & {
  readonly name: IconName;
  readonly icons: readonly IconData[];
};

function IconGlyph(props: IconGlyphProps): JSX.Element {
  const [local, others] = splitProps(props, ["name", "icons", "size", "tone", "decorative", "label", "class"]);
  const accessibility = createMemo<{ readonly label: string | undefined; readonly hidden: "true" | undefined; readonly role: "img" | undefined }>(() => {
    const label = local.label?.trim();
    if (local.decorative === false && !label) throw new Error(`${local.name} icon requires a nonempty label when decorative=false`);
    return local.decorative === false ? { label, hidden: undefined, role: "img" } : { label: undefined, hidden: "true", role: undefined };
  });
  return <span {...others} class={`sheen-icon${local.class ? ` ${local.class}` : ""}`} data-sheen-icon={local.name} data-size={local.size ?? "md"} data-tone={local.tone ?? "muted"}
    role={accessibility().role} aria-label={accessibility().label} aria-hidden={accessibility().hidden}>
    <For each={local.icons}>{(icon, index) => <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${icon.width} ${icon.height}`}
      data-sheen-icon-set-value={icon.set} data-sheen-icon-default={index() === 0 || undefined} aria-hidden="true" innerHTML={icon.body} />}</For>
  </span>;
}

export function createStaticIcon(name: IconName, icons: readonly IconData[]): Component<StaticIconProps> {
  if (!icons.length || new Set(icons.map(icon => icon.set)).size !== icons.length) throw new Error(`${name} icon requires one unique entry per bundled set`);
  return function StaticIcon(props: StaticIconProps): JSX.Element {
    return <IconGlyph {...props} name={name} icons={icons} />;
  };
}

/** Marker transformed by sheenIcons(). Use DynamicIcon only for genuinely runtime names. */
export function Icon(props: IconProps): JSX.Element {
  void props;
  throw new Error("Icon requires the sheenIcons Vite plugin; use a per-icon export in other build systems or DynamicIcon for runtime names");
}

/** Explicit full-registry path for names that cannot be statically analyzed. */
export function DynamicIcon(props: DynamicIconProps): JSX.Element {
  const name = props.name;
  if (!isIconName(name)) throw new Error(`Unknown semantic icon: ${name}`);
  const [, others] = splitProps(props, ["name"]);
  return <IconGlyph {...others} name={name} icons={iconData[name]} />;
}
