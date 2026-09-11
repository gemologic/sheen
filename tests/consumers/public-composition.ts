import { buttonVariants, cn } from "../../packages/ui/dist/index.js";
import type { SheenPolymorphicProps, ButtonProps } from "../../packages/ui/dist/index.js";

const anchor: SheenPolymorphicProps<"a", { purpose: "navigation" }> = { as: "a", href: "/orders", purpose: "navigation" };
const control: SheenPolymorphicProps<"button", { purpose: "action" }> = { as: "button", type: "submit", purpose: "action" };
// @ts-expect-error Native button props must not acquire anchor destinations.
const invalidDestination: SheenPolymorphicProps<"button"> = { href: "/orders" };
// @ts-expect-error Sheen button variants are a closed vocabulary.
const invalidVariant: ButtonProps = { variant: "primary" };
const props: ButtonProps = { variant: "soft", tone: "danger", size: "sm" };
export const composition = { anchor, control, invalidDestination, invalidVariant, class: cn(buttonVariants(props), "custom") };
