import { Heading, cn } from "@gemologic/sheen";
import { Show, children, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { requireText } from "./marketing-section.tsx";

export interface HeroProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "children"> {
  title: string;
  eyebrow?: string;
  lead?: JSX.Element;
  actions?: JSX.Element;
  media?: JSX.Element;
  headingLevel?: 1 | 2;
  align?: "start" | "center";
}

/** The opening section of a public page: eyebrow, display heading, lead copy, actions, and optional media. */
export function Hero(props: HeroProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "eyebrow", "lead", "actions", "media", "headingLevel", "align", "class"]);
  const headingId = `sheen-hero-${createUniqueId()}`;
  const title = createMemo(() => requireText(local.title, "Hero requires a nonempty title"));
  const lead = children(() => local.lead);
  const actions = children(() => local.actions);
  const media = children(() => local.media);
  return <section {...others} aria-labelledby={headingId} class={cn("sheen-hero", local.class)} data-align={local.align ?? "start"} data-media={media() ? "true" : "false"}>
    <div class="sheen-hero-inner sheen-marketing-container">
      <div class="sheen-hero-copy">
        <Show when={local.eyebrow}>{eyebrow => <p class="sheen-marketing-eyebrow">{eyebrow()}</p>}</Show>
        <Heading id={headingId} level={local.headingLevel ?? 1} size="display-1" class="sheen-hero-title">{title()}</Heading>
        <Show when={lead()}><div class="sheen-hero-lead">{lead()}</div></Show>
        <Show when={actions()}><div class="sheen-hero-actions">{actions()}</div></Show>
      </div>
      <Show when={media()}><div class="sheen-hero-media">{media()}</div></Show>
    </div>
  </section>;
}
