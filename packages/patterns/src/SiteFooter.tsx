import { Heading, Link, cn } from "@gemologic/sheen";
import { For, Show, children, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { keyedRecords, requireText } from "./marketing-section.tsx";
import type { MarketingHeadingLevel } from "./marketing-section.tsx";

export interface SiteFooterLink {
  readonly href: string;
  readonly label: string;
}

export interface SiteFooterColumn {
  readonly id: string;
  readonly title: string;
  readonly links: readonly SiteFooterLink[];
}

export interface SiteFooterProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  brand?: JSX.Element;
  description?: JSX.Element;
  columns: readonly SiteFooterColumn[];
  legal?: JSX.Element;
  legalLinks?: readonly SiteFooterLink[];
  legalLabel?: string;
  headingLevel?: Exclude<MarketingHeadingLevel, 1>;
}

/** The public-site content footer: brand blurb, labelled link columns, and a legal row. */
export function SiteFooter(props: SiteFooterProps): JSX.Element {
  const [local, others] = splitProps(props, ["brand", "description", "columns", "legal", "legalLinks", "legalLabel", "headingLevel", "class"]);
  const brand = children(() => local.brand);
  const description = children(() => local.description);
  const legal = children(() => local.legal);
  const columns = keyedRecords(() => {
    const list = local.columns;
    for (const column of list) {
      requireText(column.title, "SiteFooter column titles must be nonempty");
      for (const link of column.links) requireText(link.label, "SiteFooter link labels must be nonempty");
    }
    return list;
  }, "SiteFooter");
  const legalLinks = createMemo(() => {
    const list = local.legalLinks ?? [];
    for (const link of list) requireText(link.label, "SiteFooter legal link labels must be nonempty");
    return list;
  });
  return <footer {...others} class={cn("sheen-site-footer", local.class)}>
    <div class="sheen-marketing-container sheen-site-footer-inner">
      <div class="sheen-site-footer-main">
        <Show when={brand() || description()}>
          <div class="sheen-site-footer-about">
            <Show when={brand()}><div class="sheen-site-footer-brand">{brand()}</div></Show>
            <Show when={description()}><div class="sheen-site-footer-description">{description()}</div></Show>
          </div>
        </Show>
        <div class="sheen-site-footer-columns">
          <For each={columns.ids()}>{columnId => <Show when={columns.get(columnId)}>{column => <FooterColumn column={column()} level={local.headingLevel ?? 2} />}</Show>}</For>
        </div>
      </div>
      <Show when={legal() || legalLinks().length > 0}>
        <div class="sheen-site-footer-legal">
          <Show when={legal()}><div class="sheen-site-footer-legal-text">{legal()}</div></Show>
          <Show when={legalLinks().length > 0}>
            <nav aria-label={local.legalLabel ?? "Legal"}><ul><For each={legalLinks()}>{link => <li><Link href={link.href} variant="quiet">{link.label}</Link></li>}</For></ul></nav>
          </Show>
        </div>
      </Show>
    </div>
  </footer>;
}

function FooterColumn(props: { readonly column: SiteFooterColumn; readonly level: Exclude<MarketingHeadingLevel, 1> }): JSX.Element {
  const headingId = `sheen-site-footer-${createUniqueId()}`;
  return <nav class="sheen-site-footer-column" aria-labelledby={headingId}>
    <Heading id={headingId} level={props.level} size="h4">{props.column.title}</Heading>
    <ul><For each={props.column.links}>{link => <li><Link href={link.href} variant="quiet">{link.label}</Link></li>}</For></ul>
  </nav>;
}
