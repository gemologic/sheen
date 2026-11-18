import { Heading } from "@gemologic/sheen";
import { Show, children, createMemo } from "solid-js";
import type { Accessor, JSX } from "solid-js";

export type MarketingHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type MarketingSectionLevel = 2 | 3 | 4 | 5;

export function requireText(value: string, message: string): string {
  if (!value.trim()) throw new Error(message);
  return value;
}

/** Indexes records by their stable `id` so reconciliation follows identity rather than object replacement. */
export function keyedRecords<Item extends { readonly id: string }>(items: Accessor<readonly Item[]>, owner: string): { readonly ids: Accessor<readonly string[]>; readonly get: (id: string) => Item | undefined } {
  const index = createMemo(() => {
    const next = new Map<string, Item>();
    for (const item of items()) {
      if (!item.id.trim()) throw new Error(`${owner} item IDs must be nonempty`);
      if (next.has(item.id)) throw new Error(`${owner} duplicate item ID: ${item.id}`);
      next.set(item.id, item);
    }
    return next;
  });
  const ids = createMemo(() => [...index().keys()]);
  return { ids, get: id => index().get(id) };
}

export function nextHeadingLevel(level: MarketingHeadingLevel): MarketingHeadingLevel {
  switch (level) { case 1: return 2; case 2: return 3; case 3: return 4; case 4: return 5; default: return 6; }
}

/** Shared eyebrow, heading, and supporting copy for marketing sections. */
export function SectionIntro(props: {
  readonly id: string;
  readonly title: string;
  readonly level: MarketingHeadingLevel;
  readonly size: "h1" | "h2";
  readonly eyebrow?: string | undefined;
  readonly description?: JSX.Element | undefined;
}): JSX.Element {
  const description = children(() => props.description);
  return <div class="sheen-marketing-intro">
    <Show when={props.eyebrow}>{eyebrow => <p class="sheen-marketing-eyebrow">{eyebrow()}</p>}</Show>
    <Heading id={props.id} level={props.level} size={props.size} class="sheen-marketing-title">{props.title}</Heading>
    <Show when={description()}><div class="sheen-marketing-description">{description()}</div></Show>
  </div>;
}
