import { cn } from "@gemologic/sheen";
import { createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { SectionIntro, requireText } from "./marketing-section.tsx";
import type { MarketingSectionLevel } from "./marketing-section.tsx";

export interface MarketingSectionProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  eyebrow?: string;
  description?: JSX.Element;
  columns?: 1 | 2 | 3;
  headingLevel?: MarketingSectionLevel;
}

/** A titled public-page section that lays app-owned content, such as testimonials, on the shared marketing rhythm. */
export function MarketingSection(props: MarketingSectionProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "eyebrow", "description", "columns", "headingLevel", "class", "children"]);
  const headingId = `sheen-marketing-section-${createUniqueId()}`;
  const title = createMemo(() => requireText(local.title, "MarketingSection requires a nonempty title"));
  return <section {...others} aria-labelledby={headingId} class={cn("sheen-marketing-section sheen-marketing-section-generic", local.class)} data-columns={local.columns ?? 1}>
    <div class="sheen-marketing-container sheen-marketing-stack">
      <SectionIntro id={headingId} title={title()} level={local.headingLevel ?? 2} size="h2" eyebrow={local.eyebrow} description={local.description} />
      <div class="sheen-marketing-section-body">{local.children}</div>
    </div>
  </section>;
}
