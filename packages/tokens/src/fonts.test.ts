import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const assets = new URL("../assets/", import.meta.url);
const expectedHashes: Readonly<Record<string, string>> = {
  "InterVariable.woff2": "693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3",
  "IBMPlexMono-Regular.woff2": "ba204497f16b6d334cee9d1e963a831b73e3a56e1d6300a8489d18df7214b350",
  "IBMPlexSans-Regular.woff2": "ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a",
  "IBMPlexSans-SemiBold.woff2": "f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205",
};

describe("self-hosted font assets", () => {
  it("retains the exact licensed upstream font binaries", async () => {
    for (const [name, expected] of Object.entries(expectedHashes)) {
      const value = await readFile(new URL(`fonts/${name}`, assets));
      expect(value.subarray(0, 4).toString("ascii"), name).toBe("wOF2");
      expect(createHash("sha256").update(value).digest("hex"), name).toBe(expected);
    }
    const license = await readFile(new URL("fonts/LICENSE.txt", assets), "utf8");
    expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(license).toContain('Reserved Font Name "Plex"');
    const interLicense = await readFile(new URL("fonts/Inter-LICENSE.txt", assets), "utf8");
    expect(interLicense).toContain("SIL OPEN FONT LICENSE Version 1.1");
    expect(createHash("sha256").update(interLicense).digest("hex")).toBe("262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a");
  });

  it("declares only the token weights and prevents late font swaps", async () => {
    const css = await readFile(new URL("fonts.css", assets), "utf8");
    const sources = [...css.matchAll(/src:\s*url\("(?<path>[^"]+)"\)/g)].flatMap(match => match.groups?.path ? [match.groups.path] : []);
    expect([...css.matchAll(/@font-face/g)]).toHaveLength(4);
    expect([...css.matchAll(/font-display: optional/g)]).toHaveLength(4);
    expect(css).toMatch(/Inter Variable[\s\S]*font-weight: 100 900/);
    expect(css).toMatch(/IBM Plex Sans[\s\S]*font-weight: 400/);
    expect(css).toMatch(/IBM Plex Sans[\s\S]*font-weight: 600/);
    expect(css).toMatch(/IBM Plex Mono[\s\S]*font-weight: 400/);
    expect(sources).toEqual([
      "./fonts/InterVariable.woff2",
      "./fonts/IBMPlexSans-Regular.woff2",
      "./fonts/IBMPlexSans-SemiBold.woff2",
      "./fonts/IBMPlexMono-Regular.woff2",
    ]);
  });
});
