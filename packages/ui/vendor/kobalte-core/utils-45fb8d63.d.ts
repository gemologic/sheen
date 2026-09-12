// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
type Direction = "rtl" | "ltr";
declare const RTL_LANGS: Set<string>;
/**
 * Determines if a locale is read right to left using [Intl.Locale]
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale}.
 */
declare function isRTL(locale: string): boolean;
declare function getReadingDirection(locale: string): Direction;

export { Direction as D, RTL_LANGS as R, getReadingDirection as g, isRTL as i };
