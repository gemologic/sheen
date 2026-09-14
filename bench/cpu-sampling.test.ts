import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const moduleUrl = new URL("./cpu-sampling.ts", import.meta.url).href;

function captureSetting(environment: Readonly<Record<string, string>>): string {
  return execFileSync(process.execPath, ["--input-type=module", "-e", `import { isCpuBaselineCapture } from ${JSON.stringify(moduleUrl)}; console.log(isCpuBaselineCapture());`], {
    encoding: "utf8",
    env: { ...process.env, CI: "", GITHUB_ACTIONS: "", SHEEN_CAPTURE_CPU_BASELINE: "false", ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

describe("CPU baseline capture policy", () => {
  it("qualifies regressions by default and permits explicit local capture", () => {
    expect(captureSetting({})).toBe("false");
    expect(captureSetting({ SHEEN_CAPTURE_CPU_BASELINE: "true" })).toBe("true");
  });

  it("cannot disable regression comparisons in either CI environment", () => {
    expect(() => captureSetting({ CI: "true", SHEEN_CAPTURE_CPU_BASELINE: "true" })).toThrow("CPU baseline capture is forbidden in CI");
    expect(() => captureSetting({ GITHUB_ACTIONS: "true", SHEEN_CAPTURE_CPU_BASELINE: "true" })).toThrow("CPU baseline capture is forbidden in CI");
  });

  it("rejects misspelled settings instead of silently changing qualification", () => {
    expect(() => captureSetting({ SHEEN_CAPTURE_CPU_BASELINE: "yes" })).toThrow("SHEEN_CAPTURE_CPU_BASELINE must be true or false");
  });
});
