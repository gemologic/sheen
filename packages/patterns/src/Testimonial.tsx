import { cn } from "@gemologic/sheen";
import { Show, children, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { requireText } from "./marketing-section.tsx";

export interface TestimonialProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  quote: JSX.Element;
  author: string;
  authorRole?: string;
  avatar?: JSX.Element;
  cite?: string;
}

/** A quotation with its attributed author, role, and optional avatar. */
export function Testimonial(props: TestimonialProps): JSX.Element {
  const [local, others] = splitProps(props, ["quote", "author", "authorRole", "avatar", "cite", "class"]);
  const author = createMemo(() => requireText(local.author, "Testimonial requires a nonempty author"));
  const quote = children(() => local.quote);
  const avatar = children(() => local.avatar);
  return <figure {...others} class={cn("sheen-testimonial", local.class)}>
    <blockquote class="sheen-testimonial-quote" cite={local.cite}>{quote()}</blockquote>
    <figcaption class="sheen-testimonial-caption">
      <Show when={avatar()}><span class="sheen-testimonial-avatar">{avatar()}</span></Show>
      <span class="sheen-testimonial-attribution">
        <span class="sheen-testimonial-author">{author()}</span>
        <Show when={local.authorRole}>{role => <span class="sheen-testimonial-role">{role()}</span>}</Show>
      </span>
    </figcaption>
  </figure>;
}
