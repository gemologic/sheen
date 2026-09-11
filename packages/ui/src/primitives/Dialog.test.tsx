import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Dialog } from "./Dialog.tsx";
import { AlertDialog } from "./AlertDialog.tsx";

describe("Dialog SSR trigger contract", () => {
  it("renders distinct native triggers without hidden modal descriptions", () => {
    const html = renderToString(() => <ThemeProvider><Dialog title="Settings" trigger="Open settings" /><AlertDialog title="Remove?" description="Review this decision" trigger="Review removal" /></ThemeProvider>);
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(html).not.toContain("Review this decision");
    expect(html).not.toContain('class="sheen-dialog"');
  });
  it("permits triggerless controlled ownership without manufacturing a button", () => {
    const html = renderToString(() => <ThemeProvider><Dialog title="Programmatic" open={false} /></ThemeProvider>);
    expect(html).not.toContain("<button");
  });
});
