import { Heading, cn } from "@gemologic/sheen";
import { For, Show, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { SectionIntro, keyedRecords, nextHeadingLevel, requireText } from "./marketing-section.tsx";
import type { MarketingSectionLevel } from "./marketing-section.tsx";

export interface FeatureGridItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon?: JSX.Element;
}

export interface FeatureGridProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "children"> {
  title: string;
  eyebrow?: string;
  description?: JSX.Element;
  items: readonly FeatureGridItem[];
  columns?: 2 | 3 | 4;
  headingLevel?: MarketingSectionLevel;
}

/** A titled section of feature summaries laid out in a responsive two- to four-column grid. */
export function FeatureGrid(props: FeatureGridProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "eyebrow", "description", "items", "columns", "headingLevel", "class"]);
  const headingId = `sheen-feature-grid-${createUniqueId()}`;
  const level = () => local.headingLevel ?? 2;
  const title = createMemo(() => requireText(local.title, "FeatureGrid requires a nonempty title"));
  const items = keyedRecords(() => {
    const list = local.items;
    for (const item of list) requireText(item.title, "FeatureGrid item titles must be nonempty");
    return list;
  }, "FeatureGrid");
  return <section {...others} aria-labelledby={headingId} class={cn("sheen-feature-grid sheen-marketing-section", local.class)} data-columns={local.columns ?? 3}>
    <div class="sheen-marketing-container sheen-marketing-stack">
      <SectionIntro id={headingId} title={title()} level={level()} size="h2" eyebrow={local.eyebrow} description={local.description} />
      <ul class="sheen-feature-grid-list">
        <For each={items.ids()}>{id => <Show when={items.get(id)}>{item => <li class="sheen-feature-grid-item">
          <Show when={item().icon}><span class="sheen-feature-grid-icon" aria-hidden="true">{item().icon}</span></Show>
          <Heading level={nextHeadingLevel(level())} size="h4">{item().title}</Heading>
          <p class="sheen-feature-grid-text">{item().description}</p>
        </li>}</Show>}</For>
      </ul>
    </div>
  </section>;
}
