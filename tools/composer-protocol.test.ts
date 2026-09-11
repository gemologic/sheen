import { describe, expect, it } from "vitest";
import { readComposerPreviewMessage } from "../apps/loupe/src/composer/protocol.ts";

describe("Composer preview protocol", () => {
  it("accepts only safe non-negative applied revisions", () => {
    expect(readComposerPreviewMessage({ kind: "sheen-composer-applied", revision: 7 })).toEqual({
      kind: "sheen-composer-applied",
      revision: 7,
    });
    expect(readComposerPreviewMessage({ kind: "sheen-composer-applied", revision: -1 })).toBeUndefined();
    expect(readComposerPreviewMessage({ kind: "sheen-composer-applied", revision: 1.5 })).toBeUndefined();
    expect(readComposerPreviewMessage({ kind: "sheen-composer-applied", revision: "7" })).toBeUndefined();
  });
});
