import { describe, expect, it } from "vitest";
import { englishMessages } from "@gemologic/sheen";
import { resolveMessages } from "../../ui/src/theme/messages.ts";
import { englishTableMessages, resolveTableMessages } from "./messages.ts";

describe("table messages", () => {
  it("keeps table defaults out of the core catalog and layers provider overrides", () => {
    expect(Object.hasOwn(englishMessages, "clearFilters")).toBe(false);
    const provider = resolveMessages(englishMessages, { clearFilters: "Filter löschen", retry: "Erneut versuchen", cardView: "{caption}, Kartenansicht" });
    const table = resolveTableMessages(provider);
    expect(table.clearFilters).toBe("Filter löschen");
    expect(table.retry).toBe("Erneut versuchen");
    expect(table.cardView).toBe("{caption}, Kartenansicht");
    expect(table.filterAdd).toBe(englishTableMessages.filterAdd);
  });
});
