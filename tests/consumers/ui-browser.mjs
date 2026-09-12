import { createComponent, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Button, Link, ThemeProvider } from "@gemologic/sheen";
import { Input } from "@gemologic/sheen/forms";
import { Dialog, Popover } from "@gemologic/sheen/overlays";
import "@gemologic/sheen/styles.css";
import "@gemologic/sheen-tokens/core.css";
import "@gemologic/sheen-tokens/themes/obsidian.css";

const root = document.getElementById("consumer-root");
if (!root) throw new Error("Missing consumer mount");
render(() => {
  const [count, setCount] = createSignal(0);
  const [pending, setPending] = createSignal(false);
  return createComponent(ThemeProvider, { get children() { return [
    createComponent(Button, {
      "aria-label": "Consumer action",
      get loading() { return pending(); },
      onClick: () => setCount(value => value + 1),
      get children() { return `Count ${count()}`; },
    }),
    createComponent(Button, { onClick: () => setPending(value => !value), children: "Toggle pending" }),
    createComponent(Link, { href: "#consumer-target", variant: "button", children: "Consumer destination" }),
    createComponent(Dialog, {
      title: "Consumer dialog", trigger: "Open consumer dialog",
      get children() { return [
        createComponent(Input, { "aria-label": "Consumer dialog draft" }),
        createComponent(Dialog, {
          title: "Nested consumer dialog", trigger: "Open nested consumer dialog",
          get children() { return createComponent(Input, { "aria-label": "Nested consumer dialog draft" }); },
        }),
      ]; },
    }),
    createComponent(Popover, {
      title: "Consumer popover", trigger: "Open consumer popover",
      get children() { return [
        createComponent(Input, { "aria-label": "Consumer popover draft" }),
        createComponent(Popover, {
          title: "Nested consumer popover", trigger: "Open nested consumer popover",
          get children() { return createComponent(Input, { "aria-label": "Nested consumer popover draft" }); },
        }),
      ]; },
    }),
  ]; } });
}, root);
