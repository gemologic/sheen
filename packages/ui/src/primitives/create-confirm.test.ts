import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createConfirm } from "./create-confirm.tsx";

const options = { title: "Confirm", description: "Review the operation" };
describe("confirmation ownership", () => {
  it("settles pending and future requests false after owner disposal", async () => {
    const root = createRoot(dispose => ({ dispose, controller: createConfirm() }));
    const pending = root.controller.confirm(options);
    root.dispose();
    await expect(pending).resolves.toBe(false);
    await expect(root.controller.confirm(options)).resolves.toBe(false);
  });
  it("rejects overlap without replacing the prompt and handles abort", async () => {
    const root = createRoot(dispose => ({ dispose, controller: createConfirm() }));
    try {
      const abort = new AbortController();
      const pending = root.controller.confirm({ ...options, signal: abort.signal });
      await expect(root.controller.confirm(options)).rejects.toThrow("unanswered request");
      abort.abort();
      await expect(pending).resolves.toBe(false);
      await expect(root.controller.confirm({ ...options, signal: abort.signal })).resolves.toBe(false);
    } finally { root.dispose(); }
  });
});
