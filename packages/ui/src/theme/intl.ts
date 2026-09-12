import { createMemo } from "solid-js";
import type { Accessor } from "solid-js";
import { useTheme } from "./ThemeProvider.tsx";

/** Construct once per locale change, then reuse in every cell of a numeric column. */
export function useNumberFormatter(options: Intl.NumberFormatOptions = {}): Accessor<Intl.NumberFormat> {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  return createMemo(() => new Intl.NumberFormat(locale(), options));
}

export function useDateFormatter(options: Intl.DateTimeFormatOptions & { timeZone: string } = { timeZone: "UTC" }): Accessor<Intl.DateTimeFormat> {
  const theme = useTheme();
  const locale = createMemo(() => theme.state().locale);
  return createMemo(() => new Intl.DateTimeFormat(locale(), options));
}
