import { Show, children, createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface FormProps extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /**
   * Receives the native form data. The default submission is prevented; return a promise to mark
   * the form busy until it settles. Native constraint validation runs first.
   */
  onSubmit?: (data: FormData, event: SubmitEvent) => void | Promise<void>;
}

/** A native form that stacks sections and fields on the token rhythm and reports pending submissions. */
export function Form(props: FormProps): JSX.Element {
  const [local, others] = splitProps(props, ["onSubmit", "class", "children"]);
  const [pending, setPending] = createSignal(false);
  const submit = (event: SubmitEvent & { currentTarget: HTMLFormElement }): void => {
    if (!local.onSubmit) return;
    event.preventDefault();
    if (pending()) return;
    const result = local.onSubmit(new FormData(event.currentTarget), event);
    if (result instanceof Promise) {
      setPending(true);
      void result.finally(() => setPending(false));
    }
  };
  return <form {...others} class={cn("sheen-form", local.class)} aria-busy={pending() || undefined} data-pending={pending() || undefined} onSubmit={submit}>{local.children}</form>;
}

export interface FormSectionProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  description?: JSX.Element;
}

/** A titled group of related fields. Wide containers put the title beside the fields. */
export function FormSection(props: FormSectionProps): JSX.Element {
  const [local, others] = splitProps(props, ["title", "description", "class", "children"]);
  const description = children(() => local.description);
  return <section {...others} class={cn("sheen-form-section", local.class)}>
    <header class="sheen-form-section-header">
      <h2 class="sheen-form-section-title">{local.title}</h2>
      <Show when={description()}><p class="sheen-form-section-description">{description()}</p></Show>
    </header>
    <div class="sheen-form-section-fields">{local.children}</div>
  </section>;
}

export interface FormActionsProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Keep the actions visible at the bottom of the scrolling container. */
  sticky?: boolean;
  align?: "start" | "end" | "between";
}

/** The submit/cancel row that ends a form. Put the primary action last. */
export function FormActions(props: FormActionsProps): JSX.Element {
  const [local, others] = splitProps(props, ["sticky", "align", "class", "children"]);
  return <div {...others} class={cn("sheen-form-actions", local.class)} data-sticky={local.sticky || undefined} data-align={local.align ?? "end"}>{local.children}</div>;
}
