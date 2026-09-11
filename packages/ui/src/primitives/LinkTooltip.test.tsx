import { expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { LinkTooltip } from "./LinkTooltip.tsx";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";

it("renders a native named destination with MIME hint and no server overlay", () => {
  const html = renderToString(() => <ThemeProvider><LinkTooltip href="/report" type="text/html" target="_blank" rel="noopener" content="Read report">Report</LinkTooltip></ThemeProvider>);
  expect(html).toContain('href="/report"');
  expect(html).toContain('type="text/html"');
  expect(html).toContain('target="_blank"');
  expect(html).not.toContain('role="button"');
  expect(html).not.toContain('role="tooltip"');
});
