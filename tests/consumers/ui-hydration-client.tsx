import { hydrate } from "solid-js/web";
import { Application } from "./ui-hydration-app.tsx";
import "@gemologic/sheen/styles.css";
import "@gemologic/sheen-tokens/core.css";
import "@gemologic/sheen-tokens/themes/obsidian.css";

const root = document.getElementById("consumer-root");
if (!root) throw new Error("Missing hydration consumer root");
hydrate(() => <Application />, root);
