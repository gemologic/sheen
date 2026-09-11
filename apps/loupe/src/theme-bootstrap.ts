import { getRequestEvent, isServer } from "solid-js/web";
import { defaultThemeState, readThemeState } from "@gemologic/sheen";
import type { ThemeState } from "@gemologic/sheen";
import { iconSetForTheme } from "@gemologic/sheen-tokens/catalog";

export interface ThemeBootstrap { hydration: "client" | "cookie"; state: ThemeState }

export function getThemeBootstrap(): ThemeBootstrap {
  if (isServer) {
    const request = getRequestEvent()?.request;
    if (request && new URL(request.url).pathname === "/cookie") {
      const encoded = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith("sheen="))?.slice(6);
      try {
        const value: unknown = JSON.parse(decodeURIComponent(encoded ?? "null"));
        return { hydration: "cookie", state: readThemeState(value, defaultThemeState) };
      } catch { return { hydration: "cookie", state: { ...defaultThemeState } }; }
    }
    return { hydration: "client", state: { ...defaultThemeState } };
  }
  const content = document.getElementById("sheen-bootstrap")?.textContent;
  const value: unknown = JSON.parse(content ?? "null");
  if (typeof value !== "object" || value === null || !("state" in value) || !("hydration" in value)) throw new Error("Missing server theme bootstrap");
  return { hydration: value.hydration === "cookie" ? "cookie" : "client", state: readThemeState(value.state, defaultThemeState) };
}

export function documentThemeAttributes(bootstrap: ThemeBootstrap): Record<string, string> {
  if (bootstrap.hydration === "client") return {};
  return {
    ...Object.fromEntries(Object.entries(bootstrap.state).map(([key, value]) => [`data-sheen-${key}`, value === "system" && key === "mode" ? "dark" : value])),
    "data-sheen-icon-set": iconSetForTheme(bootstrap.state.theme),
  };
}
