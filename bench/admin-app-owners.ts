import type { JSHandle, Page } from "@playwright/test";

interface AdminAppOwners {
  readonly shell: HTMLElement;
  readonly content: HTMLElement;
  readonly chart: HTMLElement;
  details: HTMLElement | null;
  draft: HTMLInputElement | null;
}

export function captureAdminAppOwners(page: Page): Promise<JSHandle<AdminAppOwners>> {
  return page.evaluateHandle(() => {
    const shell = document.querySelector(".sheen-admin-app");
    const content = document.querySelector("[data-admin-starter-content]");
    const chart = document.querySelector(".sheen-time-series");
    if (!(shell instanceof HTMLElement) || !(content instanceof HTMLElement) || !(chart instanceof HTMLElement)) throw new Error("Missing AdminApp benchmark owners");
    return { shell, content, chart, details: document.querySelector<HTMLElement>(".sheen-admin-details-owner"), draft: document.querySelector<HTMLInputElement>('[data-benchmark-note="retained"]') };
  });
}

/** One browser evaluation, comparing original nodes rather than copied markers. */
export function retainedAdminAppOwners(nodes: AdminAppOwners, mode: "shell" | "chart" | "details" | "refresh"): boolean {
  const document = nodes.shell.ownerDocument;
  if (!nodes.shell.isConnected || document.querySelector(".sheen-admin-app") !== nodes.shell
    || !nodes.content.isConnected || document.querySelector("[data-admin-starter-content]") !== nodes.content
    || !nodes.shell.contains(nodes.content)) return false;
  if (mode === "chart" && (!nodes.chart.isConnected || !nodes.content.contains(nodes.chart))) return false;
  if (mode === "details" && (!nodes.details?.isConnected || document.querySelector(".sheen-admin-details-owner") !== nodes.details)) return false;
  return mode !== "refresh" || (nodes.draft?.isConnected === true && document.querySelector('[data-benchmark-note="retained"]') === nodes.draft
    && nodes.draft.value === "Benchmark retained draft" && document.activeElement === nodes.draft);
}
