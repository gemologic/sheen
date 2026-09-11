import { Heading } from "@gemologic/sheen";
import { Show, children, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export interface PageHeaderProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  title: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  breadcrumb?: JSX.Element | undefined;
  actions?: JSX.Element | undefined;
  tabs?: JSX.Element | undefined;
}

export function PageHeader(props: PageHeaderProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "headingLevel", "breadcrumb", "actions", "tabs", "class"]);
  const headingId = createUniqueId();
  const title = createMemo(() => {
    if (!local.title.trim()) throw new Error("PageHeader requires a nonempty title");
    return local.title;
  });
  const breadcrumb = children(() => local.breadcrumb);
  const actions = children(() => local.actions);
  const tabs = children(() => local.tabs);
  return <div {...others} role="group" aria-labelledby={headingId} class={`sheen-page-header ${local.class ?? ""}`}>
    <Show when={breadcrumb()}><div class="sheen-page-header-breadcrumb">{breadcrumb()}</div></Show>
    <div class="sheen-page-header-row">
      <Heading id={headingId} level={local.headingLevel ?? 1} size="h4">{title()}</Heading>
      <Show when={actions()}><div class="sheen-page-header-actions">{actions()}</div></Show>
    </div>
    <Show when={tabs()}><div class="sheen-page-header-tabs">{tabs()}</div></Show>
  </div>;
}
