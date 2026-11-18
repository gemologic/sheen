import { mount, StartClient } from "@solidjs/start/client";

const root = document.getElementById("app");
if (!root) throw new Error("Missing SSR application root");
mount(() => <StartClient />, root);
