import { clsx } from "clsx";
import type { ClassValue } from "clsx";

/** Flattens conditional class values. Component styles live below consumer utilities in the cascade. */
export function cn(...values: ClassValue[]): string { return clsx(values); }
