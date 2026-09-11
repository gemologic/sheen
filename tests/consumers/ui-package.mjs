import { Button, Link, buttonVariants, cn } from "@gemologic/sheen";
import "@gemologic/sheen/styles.css";
import "@gemologic/sheen-tokens/core.css";
import "@gemologic/sheen-tokens/themes/obsidian.css";

export { Button, Link };
export const composedClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "custom");
