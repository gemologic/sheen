import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createDeferredModule } from "./deferred-module.ts";

describe("createDeferredModule", () => {
  it("absorbs a failed load and retries on the next request", async () => {
    let attempts = 0;
    const loader = async (): Promise<{ readonly value: string }> => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("Importing a module script failed.");
      return { value: "loaded" };
    };
    await createRoot(async dispose => {
      const deferred = createDeferredModule(loader, () => false);
      deferred.load();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(deferred.module()).toBeUndefined();
      deferred.load();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(attempts).toBe(2);
      expect(deferred.module()?.value).toBe("loaded");
      dispose();
    });
  });
});
