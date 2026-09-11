export interface IdentifiedRow<Row extends object> {
  readonly id: string;
  readonly row: Row;
  readonly index: number;
}

/** Validate IDs once per resolution and detect changes for reused row objects. */
export function createRowIdentity<Row extends object>(getRowId: (row: Row) => string) {
  if (typeof getRowId !== "function") throw new Error("getRowId must be a function");
  let known = new WeakMap<Row, string>();
  function resolve(rows: readonly Row[]): readonly IdentifiedRow<Row>[] {
    if (!Array.isArray(rows)) throw new Error("Table rows must be an array");
    const ids = new Set<string>();
    const result: IdentifiedRow<Row>[] = [];
    let index = 0;
    for (const row of rows) {
      if (typeof row !== "object" || row === null) throw new Error(`rows[${index}] must be an object`);
      const id = getRowId(row);
      if (typeof id !== "string" || !id || id.trim() !== id) throw new Error(`rows[${index}] has an invalid stable ID`);
      if (ids.has(id)) throw new Error(`rows[${index}] duplicates row ID ${id}`);
      const prior = known.get(row);
      if (prior !== undefined && prior !== id) throw new Error(`rows[${index}] changed stable ID from ${prior} to ${id}`);
      ids.add(id);
      known.set(row, id);
      result.push(Object.freeze({ id, row, index }));
      index++;
    }
    return Object.freeze(result);
  }
  return {
    resolve,
    clear(): void { known = new WeakMap<Row, string>(); },
  };
}
