import { describe, expect, it } from "vitest";
import packageMetadata from "../package.json" with { type: "json" };
import plugin, { recommended, rules } from "./index.js";

describe("eslint-plugin-sheen exports", () => {
  it("publishes every implemented rule through the flat recommended config", () => {
    expect(plugin.meta?.name).toBe("eslint-plugin-sheen");
    expect(plugin.meta?.version).toBe(packageMetadata.version);
    expect(plugin.configs?.recommended).toBe(recommended);
    expect(Object.keys(rules).sort()).toEqual([
      "no-arbitrary-spacing",
      "no-computed-style",
      "no-direct-primitive-import",
      "no-document-scroll",
      "no-dynamic-icon-name",
      "no-hardcoded-radius",
      "no-mount-animation",
      "no-native-control",
      "no-physical-properties",
      "no-props-destructure",
      "no-raw-color",
      "no-tier1-in-component",
      "no-unknown-icon",
      "no-unsafe-seam",
      "prefer-layout-primitive",
      "require-class-merge",
      "require-icon-label",
    ]);
    expect(Object.keys(recommended.rules ?? {}).sort()).toEqual(Object.keys(rules).map(name => `sheen/${name}`).sort());
    expect(recommended.rules?.["sheen/no-dynamic-icon-name"]).toBe("warn");
    expect(recommended.rules?.["sheen/no-unsafe-seam"]).toBe("warn");
    expect(recommended.rules?.["sheen/prefer-layout-primitive"]).toBe("warn");
    expect(recommended.rules?.["sheen/no-document-scroll"]).toBe("error");
  });
});
