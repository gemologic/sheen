import { describe, expect, it } from "vitest";
import { patchedDependencyReleaseError, releaseStage, workspacePatchedDependencies } from "./release-version.ts";

describe("release publication boundary", () => {
  it("distinguishes development, prerelease, and stable versions", () => {
    expect(releaseStage("0.0.0")).toBe("development");
    expect(releaseStage("0.1.0-rc.1")).toBe("prerelease");
    expect(releaseStage("0.1.0")).toBe("stable");
    expect(() => releaseStage("next")).toThrow("Invalid public package version");
  });

  it("reads the patched dependency keys without requiring a YAML runtime", () => {
    const source = `packages:\n  - packages/*\n\npatchedDependencies:\n  solid-js@1.9.15: patches/solid.patch\n  '@kobalte/core@0.13.13': patches/kobalte.patch\n\nminimumReleaseAge: 1440\n`;
    expect(workspacePatchedDependencies(source)).toEqual(["solid-js@1.9.15", "@kobalte/core@0.13.13"]);
  });

  it("allows development and prerelease packages but blocks a stable patched release", () => {
    const dependencies = ["solid-js@1.9.15"];
    expect(patchedDependencyReleaseError("0.0.0", dependencies)).toBeUndefined();
    expect(patchedDependencyReleaseError("0.1.0-rc.1", dependencies)).toBeUndefined();
    expect(patchedDependencyReleaseError("0.1.0", dependencies)).toContain("Stable publication is blocked");
  });
});
