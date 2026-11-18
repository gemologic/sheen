import { componentIndex } from "./generated/component-index.ts";

const adminViews = ["accounts", "inbox", "settings", "audit", "status"] as const;

export const pagesRoutes: readonly string[] = Object.freeze([
  "/",
  "/admin",
  ...adminViews.map(view => `/admin/${view}`),
  "/components",
  ...componentIndex.map(component => `/components/${component.name}`),
  "/composer",
  "/composer-preview",
  "/lab",
  "/lab-preview",
  "/theme-editor",
  "/tokens",
]);
