import { For, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { IconData, StaticIconProps } from "./runtime.tsx";

export type IconGlyphState = "loading" | "unknown" | "error";

type IconGlyphProps = StaticIconProps & {
  /** A semantic name, or the unvalidated runtime name for an unknown lazy icon. */
  readonly name: string;
  readonly icons: readonly IconData[];
  readonly state?: IconGlyphState | undefined;
};

/** The single icon root shared by static, dynamic, and lazy icons, so a lazy glyph fills the same node it hydrated. */
export function IconGlyph(props: IconGlyphProps): JSX.Element {
  const [local, others] = splitProps(props, ["name", "icons", "state", "size", "tone", "decorative", "label", "class"]);
  const accessibility = createMemo<{ readonly label: string | undefined; readonly hidden: "true" | undefined; readonly role: "img" | undefined }>(() => {
    const label = local.label?.trim();
    if (local.decorative === false && !label) throw new Error(`${local.name} icon requires a nonempty label when decorative=false`);
    return local.decorative === false ? { label, hidden: undefined, role: "img" } : { label: undefined, hidden: "true", role: undefined };
  });
  return <span {...others} class={`sheen-icon${local.class ? ` ${local.class}` : ""}`} data-sheen-icon={local.name} data-size={local.size ?? "md"} data-tone={local.tone ?? "muted"}
    data-sheen-icon-state={local.state} role={accessibility().role} aria-label={accessibility().label} aria-hidden={accessibility().hidden}>
    <For each={local.icons}>{(icon, index) => <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${icon.width} ${icon.height}`}
      data-sheen-icon-set-value={icon.set} data-sheen-icon-default={index() === 0 || undefined} aria-hidden="true" innerHTML={icon.body} />}</For>
  </span>;
}
