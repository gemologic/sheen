import { cn } from "@gemologic/sheen";
import { children, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { SectionIntro, requireText } from "./marketing-section.tsx";
import type { MarketingHeadingLevel } from "./marketing-section.tsx";

export interface CtaBandProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "children"> {
  title: string;
  eyebrow?: string;
  description?: JSX.Element;
  actions: JSX.Element;
  headingLevel?: Exclude<MarketingHeadingLevel, 1>;
}

/** A closing call-to-action band with a heading, supporting copy, and primary actions. */
export function CtaBand(props: CtaBandProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "eyebrow", "description", "actions", "headingLevel", "class"]);
  const headingId = `sheen-cta-band-${createUniqueId()}`;
  const title = createMemo(() => requireText(local.title, "CtaBand requires a nonempty title"));
  const actions = children(() => local.actions);
  return <section {...others} aria-labelledby={headingId} class={cn("sheen-cta-band sheen-marketing-section", local.class)}>
    <div class="sheen-marketing-container">
      <div class="sheen-cta-band-panel">
        <SectionIntro id={headingId} title={title()} level={local.headingLevel ?? 2} size="h2" eyebrow={local.eyebrow} description={local.description} />
        <div class="sheen-cta-band-actions">{actions()}</div>
      </div>
    </div>
  </section>;
}
