import assert from "node:assert/strict";
import { createComponent } from "solid-js";
import { renderToString } from "solid-js/web";
import { Button, Link } from "@gemologic/sheen";

assert.equal(typeof document, "undefined");
const html = renderToString(() => [
  createComponent(Button, { loading: true, children: "Saving" }),
  createComponent(Link, { href: "/orders", variant: "button", children: "Orders" }),
]);
assert.match(html, /<button\b[^>]*disabled[^>]*aria-busy="true"[^>]*>Saving<\/button>/);
assert.match(html, /<a\b[^>]*href="\/orders"[^>]*>Orders<\/a>/);
assert.equal(html.match(/<button\b/g)?.length, 1);
assert.equal(html.match(/<a\b/g)?.length, 1);
console.log("Isolated Solid source SSR rendered native Button/Link without browser globals");
