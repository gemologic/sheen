import { generateHydrationScript, renderToStringAsync } from "solid-js/web";
import { Application } from "./ui-hydration-app.tsx";

export async function renderDocument(): Promise<string> {
  const content = await renderToStringAsync(() => <Application />);
  return `<!doctype html><html lang="en" data-sheen-theme="obsidian" data-sheen-mode="dark"><head><meta charset="utf-8">${generateHydrationScript()}</head><body><div id="consumer-root">${content}</div><script type="module" src="/ui-hydration-client.tsx"></script></body></html>`;
}
