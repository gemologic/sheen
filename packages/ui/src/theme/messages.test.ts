import { expect, it } from "vitest";
import { englishMessages, resolveMessages } from "./messages.ts";

it("resolves scoped messages without mutating the parent catalog", () => {
  const localized = resolveMessages(englishMessages, { close: "Schließen" });
  expect(localized.close).toBe("Schließen");
  expect(localized.retry).toBe("Retry");
  const extended = resolveMessages(localized, { clearFilters: "Filter löschen" });
  expect(extended.clearFilters).toBe("Filter löschen");
  expect(englishMessages.close).toBe("Close");
  const child = resolveMessages(localized, { retry: "Erneut versuchen" });
  expect(child.close).toBe("Schließen");
  expect(child.retry).toBe("Erneut versuchen");
  expect(localized.retry).toBe("Retry");
});
