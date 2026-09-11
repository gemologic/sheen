export interface ToolbarLayout {
  readonly visibleCount: number;
  readonly overflowCount: number;
  readonly requiredWidth: number;
}

/** Keep leading groups intact; reserve the menu trigger only when something overflows. */
export function fitToolbarGroups(widths: readonly number[], available: number, trigger: number, gap: number): ToolbarLayout {
  if ([available, trigger, gap, ...widths].some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("Toolbar measurements must be finite nonnegative numbers");
  }
  const all = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap;
  if (!Number.isFinite(all)) throw new Error("Toolbar measured width exceeds the numeric range");
  if (all <= available) return { visibleCount: widths.length, overflowCount: 0, requiredWidth: all };
  let visibleCount = 0;
  let requiredWidth = trigger;
  for (const width of widths) {
    const next = requiredWidth + gap + width;
    if (next > available) break;
    requiredWidth = next;
    visibleCount++;
  }
  return { visibleCount, overflowCount: widths.length - visibleCount, requiredWidth };
}
