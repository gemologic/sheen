import { Link, cn } from "@gemologic/sheen";
import { For, Show, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { keyedRecords, requireText } from "./marketing-section.tsx";

export interface LogoCloudItem {
  readonly id: string;
  readonly name: string;
  readonly logo?: JSX.Element;
  readonly href?: string;
}

export interface LogoCloudProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  label: string;
  items: readonly LogoCloudItem[];
}

/** A captioned row of customer or partner marks. Each mark is named in text even when a logo is drawn. */
export function LogoCloud(props: LogoCloudProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "items", "class"]);
  const captionId = `sheen-logo-cloud-${createUniqueId()}`;
  const label = createMemo(() => requireText(local.label, "LogoCloud requires a nonempty label"));
  const items = keyedRecords(() => {
    const list = local.items;
    for (const item of list) requireText(item.name, "LogoCloud item names must be nonempty");
    return list;
  }, "LogoCloud");
  return <section {...others} aria-labelledby={captionId} class={cn("sheen-logo-cloud sheen-marketing-section", local.class)}>
    <div class="sheen-marketing-container sheen-logo-cloud-inner">
      <p id={captionId} class="sheen-logo-cloud-label">{label()}</p>
      <ul class="sheen-logo-cloud-list">
        <For each={items.ids()}>{id => <Show when={items.get(id)}>{item => {
          const mark = () => <Show when={item().logo} fallback={<span class="sheen-logo-cloud-wordmark">{item().name}</span>}>
            <span class="sheen-logo-cloud-logo" aria-hidden="true">{item().logo}</span><span class="sheen-marketing-visually-hidden">{item().name}</span>
          </Show>;
          return <li class="sheen-logo-cloud-item">
            <Show when={item().href} fallback={mark()}>{href => <Link href={href()} variant="quiet" class="sheen-logo-cloud-link">{mark()}</Link>}</Show>
          </li>;
        }}</Show>}</For>
      </ul>
    </div>
  </section>;
}
