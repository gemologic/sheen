export interface PanePosition { readonly top: number; readonly left: number }

/** Bounded by pane/location pairs, not URLs alone, so dynamic pane IDs cannot grow it indefinitely. */
export function createPanePositionCache(capacity = 256) {
  if (!Number.isSafeInteger(capacity) || capacity < 1) throw new Error("Pane position cache capacity must be a positive safe integer");
  const entries = new Map<string, PanePosition>();
  const key = (location: string, pane: string) => JSON.stringify([location, pane]);
  return {
    get(location: string, pane: string): PanePosition | undefined {
      const id = key(location, pane);
      const position = entries.get(id);
      if (position) { entries.delete(id); entries.set(id, position); }
      return position;
    },
    set(location: string, pane: string, position: PanePosition): void {
      if (!Number.isFinite(position.top) || !Number.isFinite(position.left)) throw new Error("Pane positions must be finite");
      const id = key(location, pane);
      entries.delete(id);
      entries.set(id, Object.freeze({ top: position.top, left: position.left }));
      if (entries.size > capacity) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
    },
    size: () => entries.size,
  };
}
