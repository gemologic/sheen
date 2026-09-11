import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Avatar, AvatarGroup } from "./Avatar.tsx";
import { Meter, Progress } from "./Progress.tsx";

describe("Avatar and progress inventory SSR", () => {
  it("renders labeled avatar fallbacks and bounded groups", () => {
    const html = renderToString(() => <ThemeProvider><Avatar label="Ada Lovelace" /><AvatarGroup label="Reviewers" max={1} avatars={[{ id: "ada", label: "Ada Lovelace" }, { id: "grace", label: "Grace Hopper" }]} /></ThemeProvider>);
    expect(html).toContain("AL");
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="1 more"');
    expect(html).toContain("sheen-avatar-fallback");
  });
  it("formats group overflow in the scoped locale", () => {
    const avatars = Array.from({ length: 1002 }, (_, index) => ({ id: `reviewer-${index}`, label: `Reviewer ${index}` }));
    const html = renderToString(() => <ThemeProvider><AvatarGroup label="Reviewers" max={1} avatars={avatars} /></ThemeProvider>);
    expect(html).toContain('aria-label="1,001 more"');
  });
  it("renders native determinate, indeterminate, and meter semantics", () => {
    const html = renderToString(() => <ThemeProvider><Progress label="Queued" /><Progress label="Upload" value={4} max={10} />
      <Meter label="Capacity" value={50} min={0} max={100} low={45} high={82} optimum={55} />
      <Meter label="Capacity warning" value={86} min={0} max={100} low={45} high={82} optimum={55} />
      <Meter label="Capacity critical" value={90} min={0} max={100} low={55} high={82} optimum={45} /></ThemeProvider>);
    expect(html.match(/<progress\b/g)).toHaveLength(2);
    expect(html).toContain('value="4"');
    expect(html).toContain('<meter');
    expect(html).toContain('data-meter-state="optimum"');
    expect(html).toContain('data-meter-state="suboptimum"');
    expect(html).toContain('data-meter-state="critical"');
    expect(() => renderToString(() => <ThemeProvider><Meter label="Invalid" value={11} max={10} /></ThemeProvider>)).toThrow("within range");
  });
});
