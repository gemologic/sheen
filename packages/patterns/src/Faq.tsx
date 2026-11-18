import { Accordion, AccordionItem, cn } from "@gemologic/sheen";
import { For, Show, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { SectionIntro, keyedRecords, requireText } from "./marketing-section.tsx";
import type { MarketingSectionLevel } from "./marketing-section.tsx";

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: JSX.Element;
}

export interface FaqProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title" | "children"> {
  title: string;
  eyebrow?: string;
  description?: JSX.Element;
  items: readonly FaqItem[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  headingLevel?: MarketingSectionLevel;
}

/** A titled list of questions whose answers expand in place through Sheen's Accordion. */
export function Faq(props: FaqProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "eyebrow", "description", "items", "value", "defaultValue", "onValueChange", "multiple", "headingLevel", "class"]);
  const headingId = `sheen-faq-${createUniqueId()}`;
  const level = () => local.headingLevel ?? 2;
  const title = createMemo(() => requireText(local.title, "Faq requires a nonempty title"));
  const items = keyedRecords(() => local.items, "Faq");
  const itemLevel = (): 3 | 4 | 5 | 6 => { switch (level()) { case 3: return 4; case 4: return 5; case 5: return 6; default: return 3; } };
  return <section {...others} aria-labelledby={headingId} class={cn("sheen-faq sheen-marketing-section", local.class)}>
    <div class="sheen-marketing-container sheen-faq-inner">
      <SectionIntro id={headingId} title={title()} level={level()} size="h2" eyebrow={local.eyebrow} description={local.description} />
      <Accordion class="sheen-faq-list" multiple={local.multiple ?? true}
        {...(local.value === undefined ? {} : { value: local.value })}
        {...(local.defaultValue === undefined ? {} : { defaultValue: local.defaultValue })}
        {...(local.onValueChange === undefined ? {} : { onValueChange: local.onValueChange })}>
        <For each={items.ids()}>{id => <Show when={items.get(id)}>{item => <AccordionItem value={id} label={item().question} headingLevel={itemLevel()}>{item().answer}</AccordionItem>}</Show>}</For>
      </Accordion>
    </div>
  </section>;
}
