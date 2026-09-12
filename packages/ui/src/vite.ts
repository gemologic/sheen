import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, UserConfig } from "vite";

const unbundledDependencies = ["solid-js/web", "@gemologic/sheen/solid-web", "@solid-primitives/event-listener", "@solid-primitives/keyed", "@solid-primitives/map", "@solid-primitives/media", "@solid-primitives/props", "@solid-primitives/refs", "@solid-primitives/resize-observer", "@solid-primitives/utils"];

/** Resolve one fixed DOM renderer while retaining the application's shared Solid core. */
export function sheenRuntime(): Plugin {
  return {
    name: "sheen-runtime",
    enforce: "pre",
    config(): UserConfig {
      return {
        resolve: { dedupe: ["solid-js"] },
        // These native-ESM dependencies enter through private backend imports, outside Vite's initial crawl.
        optimizeDeps: { exclude: unbundledDependencies },
        ssr: { noExternal: ["@gemologic/sheen"] },
      };
    },
    resolveId(source, _importer, options) {
      // Nitro's request storage and SSR renderer must share the peer's RequestContext.
      if (source !== "solid-js/web" || options.ssr || this.environment.config.consumer === "server") return null;
      // Resolve the self-export from Sheen, including inside packages that do not depend on UI.
      return this.resolve("@gemologic/sheen/solid-web", fileURLToPath(import.meta.url), { ...options, skipSelf: true });
    },
    configEnvironment: {
      order: "post",
      handler(_name, config) {
        // Solid's development plugin explicitly includes web; do not prebundle a second renderer.
        if (config.optimizeDeps?.include) {
          config.optimizeDeps.include = config.optimizeDeps.include.filter(name => !unbundledDependencies.includes(name));
        }
      },
    },
    async configResolved(config) {
      const application = createRequire(resolve(config.root, "package.json"));
      let filename: string;
      try {
        filename = application.resolve("solid-js/package.json");
      } catch {
        throw new Error("sheenRuntime requires solid-js@1.9.15 as an application dependency");
      }
      const metadata: unknown = JSON.parse(await readFile(filename, "utf8"));
      if (typeof metadata !== "object" || metadata === null || !("version" in metadata) || metadata.version !== "1.9.15") {
        throw new Error("sheenRuntime is qualified for solid-js@1.9.15; install that version before using its vendored DOM renderer");
      }
    },
  };
}
