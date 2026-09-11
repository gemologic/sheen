import { expect, it } from "vitest";
import { resolveShortcutPlatform } from "./shortcut-platform.ts";

it("maps Apple keyboard conventions and safely falls back for absent or unknown hints", () => {
  for (const value of ["MacIntel", "MacPPC", "iPhone", "iPad", "iPod"]) expect(resolveShortcutPlatform(value)).toBe("mac");
  for (const value of ["Win32", "Linux x86_64", "Linux armv8l", "", "unknown"]) expect(resolveShortcutPlatform(value)).toBe("other");
});
