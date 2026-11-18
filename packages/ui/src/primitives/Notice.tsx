import { Show, children, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { Button } from "./Button.tsx";
import { Glyph } from "./Glyph.tsx";

export type NoticeTone = "info" | "success" | "warning" | "danger";

export interface CalloutProps extends JSX.HTMLAttributes<HTMLDivElement> {
  tone?: NoticeTone;
  heading?: string;
  /** Leading icon. Defaults to the tone's status glyph; `false` removes it. */
  icon?: JSX.Element | false;
  /** Follow-up actions such as a Button or Link, placed after the message. */
  actions?: JSX.Element;
  /** Shows a dismiss button. The owner removes the notice in response. */
  onDismiss?: () => void;
  /** Accessible name for the dismiss button. */
  dismissLabel?: string;
}
export type AlertProps = CalloutProps;
export type BannerProps = CalloutProps;

const glyphs = { info: "status-info", success: "status-success", warning: "status-warning", danger: "status-danger" } as const;

function NoticeFrame(props: CalloutProps & { readonly kind: "callout" | "alert" | "banner"; readonly fallbackTone: NoticeTone; readonly role: "note" | "alert" | "region" }): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["kind", "fallbackTone", "role", "class", "tone", "heading", "icon", "actions", "onDismiss", "dismissLabel", "children"]);
  const tone = (): NoticeTone => local.tone ?? local.fallbackTone;
  const icon = children(() => local.icon === false ? undefined : local.icon ?? <Glyph name={glyphs[tone()]} />);
  const actions = children(() => local.actions);
  return <div {...others} class={cn("sheen-notice", local.kind === "banner" && "sheen-banner", local.class)} data-tone={tone()} role={local.role}
    aria-atomic={local.role === "alert" ? "true" : undefined} aria-label={local.role === "region" ? local.heading ?? theme.messages().announcement : undefined}>
    <Show when={local.icon !== false}><span class="sheen-notice-icon" aria-hidden="true">{icon()}</span></Show>
    <div class="sheen-notice-body">
      <Show when={local.heading}><strong class="sheen-notice-heading">{local.heading}</strong></Show>
      <div class="sheen-notice-content">{local.children}</div>
      <Show when={actions()}><div class="sheen-notice-actions">{actions()}</div></Show>
    </div>
    <Show when={local.onDismiss}>{dismiss => <Button variant="ghost" size="sm" class="sheen-notice-dismiss" aria-label={local.dismissLabel ?? theme.messages().dismiss} onClick={() => dismiss()()}><Glyph name="close" /></Button>}</Show>
  </div>;
}

/** Static, contextual information in the flow of a page. */
export function Callout(props: CalloutProps): JSX.Element {
  return <NoticeFrame {...props} kind="callout" fallbackTone="info" role="note" />;
}

/** A live, assertive message for something the user must notice now. */
export function Alert(props: AlertProps): JSX.Element {
  return <NoticeFrame {...props} kind="alert" fallbackTone="danger" role="alert" />;
}

/** A full-width announcement at the top of a page or app shell, such as maintenance or billing state. */
export function Banner(props: BannerProps): JSX.Element {
  return <NoticeFrame {...props} kind="banner" fallbackTone="info" role="region" />;
}
