import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { ActivityTimeline } from "./ActivityTimeline.tsx";
import { Stepper } from "./Stepper.tsx";

describe("workflow component server contracts", () => {
  it("renders complete list, time, state, link, action, current, and progress semantics", () => {
    const html = renderToString(() => <ThemeProvider hydration="cookie"><ActivityTimeline label="Activity" refreshing items={[
      { id: "done", title: "Approved", state: "completed", timestamp: "2026-09-08T18:00:00Z", timeLabel: "2:00 PM" },
      { id: "failed", title: "Deploy failed", state: "error" },
    ]} /><Stepper label="Setup" steps={[
      { kind: "status", id: "account", label: "Account", state: "completed" },
      { kind: "link", id: "team", label: "Team", state: "current", href: "/team" },
      { kind: "action", id: "retry", label: "Retry", state: "error", onSelect: () => {} },
    ]} /></ThemeProvider>);
    expect(html).toContain("<ol");
    expect(html).toContain("<time");
    expect(html).toContain('datetime="2026-09-08T18:00:00Z"');
    expect(html).toContain("Completed");
    expect(html).toContain("Error");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('href="/team"');
    expect(html).toContain("<button");
    expect(html).toContain("<progress");
    expect(html).toContain('aria-busy="true"');
  });

  it("rejects duplicate IDs, ambiguous current state, and incomplete timestamps", () => {
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><ActivityTimeline label="Activity" items={[{ id: "same", title: "A", state: "completed" }, { id: "same", title: "B", state: "current" }]} /></ThemeProvider>)).toThrow("duplicate item ID");
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><ActivityTimeline label="Activity" items={[{ id: "time", title: "A", state: "completed", timestamp: "2026-09-08T18:00:00Z" }]} /></ThemeProvider>)).toThrow("timestamp and timeLabel");
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><Stepper label="Setup" steps={[{ kind: "status", id: "one", label: "One", state: "current" }, { kind: "status", id: "two", label: "Two", state: "current" }]} /></ThemeProvider>)).toThrow("only one step may be current");
  });
});
