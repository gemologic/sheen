import { describe, expect, it } from "vitest";
import { createTextNormalizer } from "./text-normalization.ts";

describe("table text normalization", () => {
  it("matches the NFC/locale contract for ASCII text, including Turkish and Azeri I", () => {
    const ascii = Array.from({ length: 128 }, (_, index) => String.fromCharCode(index)).join("");
    for (const locale of ["en-US", "tr-TR", "az-AZ", "lt-LT", "el-GR", "de-DE", "sv-SE"]) {
      for (const caseSensitive of [false, true]) {
        const normalize = createTextNormalizer(locale, caseSensitive);
        for (const text of ["", ascii, "ID I II IJ", "Aperture 001", "NEEDLE account 123"]) {
          const expected = caseSensitive ? text.normalize("NFC") : text.normalize("NFC").toLocaleLowerCase(locale).normalize("NFC");
          expect(normalize(text)).toBe(expected);
        }
      }
    }
    expect(createTextNormalizer("tr-TR")("I")).toBe("ı");
    expect(createTextNormalizer("en-US")("I")).toBe("i");
  });

  it("retains full Unicode normalization and contextual casing for non-ASCII values", () => {
    const texts = ["CAFÉ", "cafe\u0301", "İ I ı i", "I\u0307", "I\u0301", "J\u0300", "ΟΣ ΟΣΑ", "Å Ä Ö", "Straße", "😀"];
    for (const locale of ["en-US", "tr-TR", "az-AZ", "lt-LT", "el-GR"]) {
      for (const caseSensitive of [false, true]) {
        const normalize = createTextNormalizer(locale, caseSensitive);
        for (const text of texts) {
          const expected = caseSensitive ? text.normalize("NFC") : text.normalize("NFC").toLocaleLowerCase(locale).normalize("NFC");
          expect(normalize(text)).toBe(expected);
        }
      }
    }
  });
});
