import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "../theme/ThemeProvider.tsx";
import { Toast } from "./Toast.tsx";
import type { ToastNotification } from "./create-toaster.ts";

const notification: ToastNotification = {
  id: Symbol("toast"), state: "idle", options: { title: "Saved", description: "Changes accepted", tone: "success", priority: "polite", duration: null,
    action: { label: "Undo", errorMessage: "Undo failed safely", run: () => {} } },
};
const render = (state: ToastNotification["state"]) => renderToString(() => <ThemeProvider><ThemeScope messages={{ close: "Dismiss", retry: "Try again" }}>
  <Toast notification={{ ...notification, state, error: new Error("SECRET transport details") }} onAction={() => {}} onDismiss={() => {}} />
</ThemeScope></ThemeProvider>);

describe("Toast message card", () => {
  it("associates its visible title and description and uses localized native controls", () => {
    const html = render("idle");
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain("Changes accepted");
    expect(html).toContain("Dismiss");
    expect(html).toContain("Undo");
    expect(html).not.toContain("SECRET");
    expect(html).not.toContain('role="alert"');
  });
  it("disables pending action while keeping dismissal available", () => {
    const html = render("pending");
    expect(html).toContain('data-pending="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading");
    const buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map(match => match[1] ?? "");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).not.toContain("disabled");
    expect(buttons[1]).toContain("disabled");
  });
  it("renders safe failure text with the scoped retry label and never raw error details", () => {
    const html = render("failed");
    expect(html).toContain("Undo failed safely");
    expect(html).toContain("Try again");
    expect(html).toContain('data-invalid="true"');
    expect(html).toContain('data-tone="danger"');
    expect(html).not.toContain("SECRET");
  });
});
