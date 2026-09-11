import { createComponent, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Button, Link } from "@gemologic/sheen";
import "@gemologic/sheen/styles.css";
import "@gemologic/sheen-tokens/core.css";
import "@gemologic/sheen-tokens/themes/obsidian.css";

const root = document.getElementById("consumer-root");
if (!root) throw new Error("Missing consumer mount");
render(() => {
  const [count, setCount] = createSignal(0);
  const [pending, setPending] = createSignal(false);
  return [
    createComponent(Button, {
      "aria-label": "Consumer action",
      get loading() { return pending(); },
      onClick: () => setCount(value => value + 1),
      get children() { return `Count ${count()}`; },
    }),
    createComponent(Button, { onClick: () => setPending(value => !value), children: "Toggle pending" }),
    createComponent(Link, { href: "#consumer-target", variant: "button", children: "Consumer destination" }),
  ];
}, root);
