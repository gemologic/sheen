const ascii = /^[\u0000-\u007f]*$/u;

/** NFC and locale casing, without Unicode normalization work for ASCII-only values. */
export function createTextNormalizer(locale: string, caseSensitive = false): (value: string) => string {
  const asciiLowercase = caseSensitive || "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toLocaleLowerCase(locale) === "abcdefghijklmnopqrstuvwxyz";
  return value => {
    if (ascii.test(value)) {
      if (caseSensitive) return value;
      return asciiLowercase ? value.toLowerCase() : value.toLocaleLowerCase(locale);
    }
    const normalized = value.normalize("NFC");
    return caseSensitive ? normalized : normalized.toLocaleLowerCase(locale).normalize("NFC");
  };
}
