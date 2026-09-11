import { Heading, cn } from "@gemologic/sheen";
import { Show, children, createMemo, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export type AuthLayoutContentWidth = "sm" | "md";
export type AuthLayoutAsidePosition = "start" | "end";

interface AuthLayoutSharedProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "aria-label" | "children" | "ref" | "use:eventListener"> {
  readonly ref?: HTMLElement | ((element: HTMLElement) => void) | undefined;
  readonly label: string;
  readonly brand: JSX.Element;
  readonly children: JSX.Element;
  readonly footer?: JSX.Element | undefined;
  readonly contentWidth?: AuthLayoutContentWidth | undefined;
}

export interface FocusedAuthLayoutBaseProps extends AuthLayoutSharedProps {
  readonly presentation?: "focused" | undefined;
  readonly aside?: undefined;
  readonly asideLabel?: undefined;
  readonly asidePosition?: undefined;
}

export interface BrandSplitAuthLayoutBaseProps extends AuthLayoutSharedProps {
  readonly presentation: "brand-split";
  readonly aside: JSX.Element;
  readonly asideLabel: string;
  readonly asidePosition?: AuthLayoutAsidePosition | undefined;
}

export type AuthLayoutProps = FocusedAuthLayoutBaseProps | BrandSplitAuthLayoutBaseProps;

interface AuthStarterProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "aria-label" | "children" | "ref" | "title" | "use:eventListener"> {
  readonly ref?: HTMLElement | ((element: HTMLElement) => void) | undefined;
  readonly brand: JSX.Element;
  readonly title: string;
  readonly description?: JSX.Element | undefined;
  readonly children: JSX.Element;
  readonly footer?: JSX.Element | undefined;
  readonly headingLevel?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  readonly contentWidth?: AuthLayoutContentWidth | undefined;
}

export type FocusedAuthLayoutProps = AuthStarterProps;

export interface BrandSplitAuthLayoutProps extends AuthStarterProps {
  readonly aside: JSX.Element;
  readonly asideLabel: string;
  readonly asidePosition?: AuthLayoutAsidePosition | undefined;
}

function nonempty(value: string, component: string, prop: string): string {
  if (!value.trim()) throw new Error(`${component} requires a nonempty ${prop}`);
  return value;
}

function AuthPanel(props: Pick<AuthStarterProps, "children" | "description" | "headingLevel" | "title">): JSX.Element {
  const headingId = createUniqueId();
  const description = children(() => props.description);
  const body = children(() => props.children);
  const title = createMemo(() => nonempty(props.title, "Auth layout", "title"));
  return <section class="sheen-auth-panel" aria-labelledby={headingId}>
    <header class="sheen-auth-panel-header">
      <Heading id={headingId} level={props.headingLevel ?? 1} size="h2">{title()}</Heading>
      <Show when={description()}>{value => <div class="sheen-auth-layout-description">{value()}</div>}</Show>
    </header>
    <div class="sheen-auth-layout-body">{body()}</div>
  </section>;
}

/** A deterministic authentication page frame. Authentication and session ownership remain in the application. */
export function AuthLayout(props: AuthLayoutProps): JSX.Element {
  const [local, others] = splitProps(props, ["ref", "class", "label", "presentation", "brand", "children", "footer", "contentWidth", "aside", "asideLabel", "asidePosition"]);
  const brand = children(() => local.brand);
  const content = children(() => local.children);
  const footer = children(() => local.footer);
  const aside = children(() => local.aside);
  const label = createMemo(() => nonempty(local.label, "AuthLayout", "label"));
  const presentation = createMemo(() => {
    const value = local.presentation ?? "focused";
    if (value !== "focused" && value !== "brand-split") throw new Error("AuthLayout presentation must be focused or brand-split");
    return value;
  });
  const contentWidth = createMemo(() => {
    const value = local.contentWidth ?? "md";
    if (value !== "sm" && value !== "md") throw new Error("AuthLayout contentWidth must be sm or md");
    return value;
  });
  const asidePosition = createMemo<AuthLayoutAsidePosition | undefined>(() => {
    if (presentation() === "focused") {
      if (local.aside !== undefined || local.asideLabel !== undefined || local.asidePosition !== undefined) throw new Error("Focused AuthLayout does not accept aside props");
      return undefined;
    }
    const value = local.asidePosition ?? "start";
    if (value !== "start" && value !== "end") throw new Error("AuthLayout asidePosition must be start or end");
    return value;
  });
  const asideLabel = createMemo(() => {
    if (presentation() === "focused") return undefined;
    if (aside() === undefined || aside() === null || aside() === false) throw new Error("Brand-split AuthLayout requires aside content");
    return nonempty(local.asideLabel ?? "", "Brand-split AuthLayout", "asideLabel");
  });
  return <main {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-auth-layout", local.class)}
    aria-label={label()} data-presentation={presentation()} data-content-width={contentWidth()} data-aside-position={asidePosition()}>
    <div class="sheen-auth-layout-frame">
      <div class="sheen-auth-layout-content-region">
        <div class="sheen-auth-layout-content">
          <div class="sheen-auth-layout-brand">{brand()}</div>
          <div class="sheen-auth-layout-surface">{content()}</div>
          <Show when={footer()}>{value => <footer class="sheen-auth-layout-footer">{value()}</footer>}</Show>
        </div>
      </div>
      <Show when={presentation() === "brand-split"}><aside class="sheen-auth-layout-aside" aria-label={asideLabel()}>{aside()}</aside></Show>
    </div>
  </main>;
}

/** A centered authentication card for focused provider or credential flows. */
export function FocusedAuthLayout(props: FocusedAuthLayoutProps): JSX.Element {
  const [local, others] = splitProps(props, ["ref", "class", "brand", "title", "description", "children", "footer", "headingLevel", "contentWidth"]);
  const brand = children(() => local.brand);
  const body = children(() => local.children);
  const footer = children(() => local.footer);
  const title = createMemo(() => nonempty(local.title, "FocusedAuthLayout", "title"));
  return <AuthLayout {...others} ref={local.ref} class={cn("sheen-focused-auth-layout", local.class)} label={title()} presentation="focused" brand={brand()}
    contentWidth={local.contentWidth ?? "sm"} footer={footer()}>
    <AuthPanel title={title()} description={local.description} headingLevel={local.headingLevel}>{body()}</AuthPanel>
  </AuthLayout>;
}

/** A branded two-pane authentication page that becomes the focused layout on narrow screens. */
export function BrandSplitAuthLayout(props: BrandSplitAuthLayoutProps): JSX.Element {
  const [local, others] = splitProps(props, ["ref", "class", "brand", "title", "description", "children", "footer", "headingLevel", "contentWidth", "aside", "asideLabel", "asidePosition"]);
  const brand = children(() => local.brand);
  const body = children(() => local.children);
  const footer = children(() => local.footer);
  const aside = children(() => local.aside);
  const title = createMemo(() => nonempty(local.title, "BrandSplitAuthLayout", "title"));
  const asideLabel = createMemo(() => nonempty(local.asideLabel, "BrandSplitAuthLayout", "asideLabel"));
  return <AuthLayout {...others} ref={local.ref} class={cn("sheen-brand-split-auth-layout", local.class)} label={title()} presentation="brand-split"
    brand={brand()} contentWidth={local.contentWidth ?? "md"} footer={footer()} aside={aside()} asideLabel={asideLabel()} asidePosition={local.asidePosition ?? "start"}>
    <AuthPanel title={title()} description={local.description} headingLevel={local.headingLevel}>{body()}</AuthPanel>
  </AuthLayout>;
}
