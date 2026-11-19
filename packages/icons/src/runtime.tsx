import { splitProps } from "solid-js";
import type { Component, JSX } from "solid-js";
import { iconData } from "./generated/catalog.ts";
import { IconGlyph } from "./glyph.tsx";
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
