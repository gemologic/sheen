import { dirname, join } from "node:path";
import { defineConfig, devices, webkit } from "@playwright/test";
import base from "./playwright.config";

const nixWebKit = process.env.SHEEN_NIX_WEBKIT === "1";
const webKitRoot = dirname(webkit.executablePath());
const miniBrowserRoot = join(webKitRoot, "minibrowser-wpe");
const nixLibraryPath = [join(miniBrowserRoot, "lib"), join(miniBrowserRoot, "sys", "lib"), process.env.LD_LIBRARY_PATH].filter(value => value !== undefined).join(":");

/** Cross-engine interaction gate. Chromium-only unload tests and raster baselines stay separate. */
export default defineConfig({
  ...base,
  outputDir: "test-results/webkit",
  projects: [{
    name: "webkit",
    use: {
      ...devices["Desktop Safari"],
      ...(nixWebKit ? { launchOptions: {
        executablePath: join(miniBrowserRoot, "bin", "MiniBrowser"),
        env: {
          LD_LIBRARY_PATH: nixLibraryPath,
          WEBKIT_EXEC_PATH: join(miniBrowserRoot, "bin"),
          WEBKIT_INJECTED_BUNDLE_PATH: join(miniBrowserRoot, "lib"),
        },
      } } : {}),
    },
    testMatch: [
      "**/button-group.spec.ts",
      "**/icon-button.spec.ts",
      "**/link.spec.ts",
      "**/theme.spec.ts",
      "**/hydration-refresh.spec.ts",
      "**/shell.spec.ts",
      "**/shell-shortcuts.spec.ts",
      "**/shell-sidebar.spec.ts",
      "**/shell-drawer.spec.ts",
      "**/shell-drawer-controlled.spec.ts",
      "**/shell-drawer-persistence.spec.ts",
      "**/shell-drawer-overlay.spec.ts",
      "**/shell-drawer-motion.spec.ts",
      "**/shell-drawer-scroll.spec.ts",
      "**/sidebar-route-restoration.spec.ts",
      "**/dialogs.spec.ts",
      "**/floating.spec.ts",
      "**/drawer.spec.ts",
      "**/menus.spec.ts",
      "**/select.spec.ts",
      "**/combobox.spec.ts",
      "**/toast.spec.ts",
      "**/toaster.spec.ts",
      "**/admin-controls-gallery.spec.ts",
      "**/admin-app.spec.ts",
      "**/admin-model-refresh.spec.ts",
      "**/composer.spec.ts",
      "**/date-time.spec.ts",
      "**/data-table-accessibility.spec.ts",
      "**/data-table-presentation.spec.ts",
      "**/data-table-search-integration.spec.ts",
      "**/table-edit.spec.ts",
      "**/table-export.spec.ts",
      "**/table-mobile.spec.ts",
      "**/table-requests.spec.ts",
      "**/table-search.spec.ts",
      "**/table-selection.spec.ts",
      "**/table-url.spec.ts",
      "**/table-views.spec.ts",
    ],
  }],
});
