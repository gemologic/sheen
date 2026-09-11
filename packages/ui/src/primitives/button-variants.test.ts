import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button-variants.ts";
import { cn } from "../utils/cn.ts";

describe("public button composition", () => {
  it("supplies quiet defaults and independent complete axes without DOM attributes", () => {
    expect(buttonVariants()).toBe("sheen-button sheen-button-ghost sheen-button-neutral sheen-button-md");
    for (const variant of ["solid", "soft", "outline", "ghost", "link"] satisfies Array<"solid" | "soft" | "outline" | "ghost" | "link">) {
      expect(buttonVariants({ variant, tone: "danger", size: "xs" }).split(" ")).toEqual(["sheen-button", `sheen-button-${variant}`, "sheen-button-danger", "sheen-button-xs"]);
    }
  });
  it("flattens caller classes after the recipe without pretending to resolve their utility conflicts", () => {
    const classes = cn(buttonVariants({ class: "px-2 hidden" }), [false, "px-4"], { "inline-flex": true });
    expect(classes.split(" ")).toEqual([
      "sheen-button", "sheen-button-ghost", "sheen-button-neutral", "sheen-button-md",
      "px-2", "hidden", "px-4", "inline-flex",
    ]);
  });
});
