import { hydrate, render, renderToString } from "@gemologic/sheen/solid-web";
import type { JSX } from "solid-js";

const content: () => JSX.Element = () => "Accepted content";
const mount = document.createElement("main");
const disposeRender: () => void = render(content, mount);
const disposeHydration: () => void = hydrate(content, mount);
const serverMarkup: string = renderToString(content);
void [disposeRender, disposeHydration, serverMarkup];

// @ts-expect-error The DOM renderer requires a real element, not an element id.
render(content, "consumer-root");
