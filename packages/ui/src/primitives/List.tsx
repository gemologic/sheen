import { Show, children, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { Link } from "./Link.tsx";

export interface ListProps extends JSX.HTMLAttributes<HTMLUListElement> {
  /** Accessible name when the surrounding heading does not already name the list. */
  label?: string;
  /** Draw separators between rows. */
  dividers?: boolean;
  /** Row padding. */
  density?: "compact" | "default" | "comfortable";
  /** Wrap the rows in a raised, bordered surface. */
  inset?: boolean;
}

/** A vertical list of rows. Rows are links, actions, or static content; it is not a selection widget. */
export function List(props: ListProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "dividers", "density", "inset", "class", "children"]);
  return <ul {...others} role="list" aria-label={local.label} class={cn("sheen-list", local.class)}
    data-dividers={local.dividers || undefined} data-density={local.density ?? "default"} data-inset={local.inset || undefined}>{local.children}</ul>;
}

export interface ListItemProps extends Omit<JSX.LiHTMLAttributes<HTMLLIElement>, "title" | "onSelect"> {
  /** Primary row text. */
  title: JSX.Element;
  /** Secondary text under the title. */
  description?: JSX.Element;
  /** Leading visual such as an icon or Avatar; decorative unless it carries its own name. */
  leading?: JSX.Element;
  /** Trailing content such as a Badge, metadata, or a count. */
  trailing?: JSX.Element;
  /** Makes the row a link. */
  href?: string;
  /** Makes the row a button. Ignored when `href` is set. */
  onSelect?: () => void;
  /** Marks a link row as the current page. */
  current?: boolean;
  /** Visual selected state for rows that drive a detail view. */
  selected?: boolean;
  disabled?: boolean;
}

/** One row of a List with leading, title, description, and trailing slots. */
export function ListItem(props: ListItemProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "description", "leading", "trailing", "href", "onSelect", "current", "selected", "disabled", "class"]);
  // Slots are JSX getters: resolve each once so a Show condition and its content share one node.
  const leading = children(() => local.leading);
  const title = children(() => local.title);
  const description = children(() => local.description);
  const trailing = children(() => local.trailing);
  const content = (): JSX.Element => <>
    <Show when={leading()}><span class="sheen-list-item-leading" aria-hidden="true">{leading()}</span></Show>
    <span class="sheen-list-item-copy">
      <span class="sheen-list-item-title">{title()}</span>
      <Show when={description()}><span class="sheen-list-item-description">{description()}</span></Show>
    </span>
    <Show when={trailing()}><span class="sheen-list-item-trailing">{trailing()}</span></Show>
  </>;
  return <li {...others} class={cn("sheen-list-item", local.class)} data-selected={local.selected || undefined} data-disabled={local.disabled || undefined}
    data-interactive={local.href !== undefined || local.onSelect !== undefined || undefined}>
    <Show when={local.href} fallback={<Show when={local.onSelect} fallback={<div class="sheen-list-item-row">{content()}</div>}>
      {select => <button type="button" class="sheen-list-item-row" disabled={local.disabled} onClick={() => select()()}>{content()}</button>}
    </Show>}>
      {href => <Link variant="quiet" class="sheen-list-item-row" href={href()} aria-current={local.current ? "page" : undefined}>{content()}</Link>}
    </Show>
  </li>;
}
