import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Alert, Banner, Callout } from "./Notice.tsx";

describe("Notice SSR", () => {
  it("renders tone icons, actions, and a named dismiss control", () => {
    const html = renderToString(() => <ThemeProvider><Alert heading="Save failed" actions={<button type="button">Retry</button>} onDismiss={() => {}}>Draft retained.</Alert></ThemeProvider>);
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-glyph="status-danger"');
    expect(html).toContain("sheen-notice-actions");
    expect(html).toContain('aria-label="Dismiss"');
  });
  it("lets callouts drop the icon and names banners as regions", () => {
    const callout = renderToString(() => <ThemeProvider><Callout icon={false}>Note</Callout></ThemeProvider>);
    expect(callout).toContain('role="note"');
    expect(callout).not.toContain("sheen-notice-icon");
    const banner = renderToString(() => <ThemeProvider><Banner tone="warning" heading="Maintenance">Writes pause.</Banner></ThemeProvider>);
    expect(banner).toContain('role="region"');
    expect(banner).toContain('aria-label="Maintenance"');
    expect(banner).toContain("sheen-banner");
    expect(banner).not.toContain("sheen-notice-dismiss");
  });
});
