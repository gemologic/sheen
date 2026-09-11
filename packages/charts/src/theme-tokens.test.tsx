import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { useThemeTokens } from "./theme-tokens.ts";

function TokenConsumer() {
  const values = useThemeTokens(["--sheen-chart-1", "--sheen-chart-grid"]);
  return <output data-chart={values()["--sheen-chart-1"]}>{values()["--sheen-chart-grid"]}</output>;
}

describe("theme token bridge SSR", () => {
  it("renders deterministic empty enhancement values without browser globals", () => {
    const html = renderToString(() => <ThemeProvider><TokenConsumer /></ThemeProvider>);
    expect(html).toContain("<output");
    expect(html).not.toContain("data-chart=");
    expect(html).not.toContain("data-sheen-theme-token-probe");
  });

  it("requires theme ownership and rejects invalid token names", () => {
    expect(() => renderToString(() => <TokenConsumer />)).toThrow("ThemeProvider");
    function InvalidConsumer() {
      // @ts-expect-error Runtime validation also protects JavaScript consumers.
      useThemeTokens(["chart-1"]);
      return null;
    }
    expect(() => renderToString(() => <ThemeProvider><InvalidConsumer /></ThemeProvider>)).toThrow("Invalid sheen token name");
  });
});
