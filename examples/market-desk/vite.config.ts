import { sheenRuntime } from "@gemologic/sheen/vite";
import { sheenIcons } from "@gemologic/sheen-icons/vite";
import { solidStart } from "@solidjs/start/config";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { devRequestCancellation } from "./dev-request-cancellation.ts";

export default defineConfig({
  plugins: [sheenRuntime(), sheenIcons({ sets: ["radix", "phosphor"] }), solidStart({ devOverlay: false }), nitro(), devRequestCancellation()],
  server: { strictPort: true },
});
