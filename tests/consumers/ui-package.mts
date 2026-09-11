import { Button, Link, buttonVariants, cn } from "@gemologic/sheen";
import type { ButtonProps, LinkProps, SheenPolymorphicProps } from "@gemologic/sheen";

const anchor: SheenPolymorphicProps<"a", { purpose: "navigation" }> = { href: "/orders", purpose: "navigation" };
const button: ButtonProps = { variant: "outline", tone: "neutral", size: "sm", loading: true };
const link: LinkProps = { href: "/orders", variant: "button", target: "_blank" };
// @ts-expect-error Native Button does not accept a destination.
const invalidButton: ButtonProps = { href: "/orders" };
// @ts-expect-error Link needs a real destination.
const invalidLink: LinkProps = { variant: "button" };
// @ts-expect-error Public type seam preserves native button prop constraints.
const invalidPolymorphism: SheenPolymorphicProps<"button"> = { href: "/orders" };
export const consumer = { Button, Link, anchor, button, link, invalidButton, invalidLink, invalidPolymorphism, class: cn(buttonVariants(button), "custom") };
