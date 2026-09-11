export type HierarchyLoadOutcome = "changed" | "loaded" | "failed" | "superseded" | "busy" | "unchanged" | "disposed";

export interface RowHierarchyOptions<Row extends object> {
  readonly getRowId: (row: Row) => string;
  /** Return known children synchronously. Undefined means children are not loaded. */
  readonly getChildren?: (row: Row) => readonly Row[] | undefined;
  /** Marks an unloaded row as a parent. Defaults true for every unloaded row when loadChildren exists. */
  readonly canLoadChildren?: (row: Row) => boolean;
  readonly loadChildren?: (row: Row, signal: AbortSignal) => Promise<readonly Row[]>;
  readonly defaultExpanded?: boolean | readonly string[] | ((row: Row) => boolean);
}

export interface HierarchyRow<Row extends object> {
  readonly id: string;
  readonly row: Row;
  readonly parentId: string | null;
  readonly depth: number;
  readonly position: number;
  readonly setSize: number;
  readonly canExpand: boolean;
  readonly expanded: boolean;
  readonly unloaded: boolean;
  readonly pending: boolean;
  readonly error: unknown;
}

interface NodeDescriptor<Row extends object> {
  readonly id: string;
  readonly row: Row;
  readonly parentId: string | null;
  readonly depth: number;
  readonly position: number;
  readonly setSize: number;
  readonly children: readonly string[] | undefined;
  readonly loadable: boolean;
  readonly staticChildren: boolean;
}

interface NodeState<Row extends object> extends NodeDescriptor<Row> {
  expanded: boolean;
  pending: boolean;
  error: unknown;
  token: number;
  controller: AbortController | undefined;
  loaded: readonly Row[] | undefined;
}

interface BuiltHierarchy<Row extends object> {
  readonly roots: readonly Row[];
  readonly rootIds: readonly string[];
  readonly descriptors: ReadonlyMap<string, NodeDescriptor<Row>>;
  readonly objectIds: readonly { readonly row: Row; readonly id: string }[];
}

function validatedRows<Row extends object>(value: readonly Row[], label: string): readonly Row[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const rows: Row[] = [];
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index) || typeof value[index] !== "object" || value[index] === null) throw new Error(`${label}[${index}] must be an object`);
    rows.push(value[index]!);
  }
  return Object.freeze(rows);
}

/** Owns expansion and independent child-load lifecycles without mutating application rows. */
export function createRowHierarchy<Row extends object>(options: RowHierarchyOptions<Row>) {
  if (typeof options.getRowId !== "function") throw new Error("Row hierarchy requires getRowId");
  if (options.getChildren !== undefined && typeof options.getChildren !== "function") throw new Error("getChildren must be a function");
  if (options.canLoadChildren !== undefined && typeof options.canLoadChildren !== "function") throw new Error("canLoadChildren must be a function");
  if (options.loadChildren !== undefined && typeof options.loadChildren !== "function") throw new Error("loadChildren must be a function");
  const defaultValue = options.defaultExpanded;
  const defaultList = typeof defaultValue === "object" ? defaultValue : undefined;
  const defaultIds = defaultList ? new Set<string>() : undefined;
  if (defaultList && defaultIds) {
    for (const id of defaultList) {
      if (typeof id !== "string" || !id.trim() || defaultIds.has(id)) throw new Error("defaultExpanded IDs must be unique nonempty strings");
      defaultIds.add(id);
    }
  }
  let roots: readonly Row[] = Object.freeze([]);
  let rootIds: readonly string[] = Object.freeze([]);
  const states = new Map<string, NodeState<Row>>();
  const objectIds = new WeakMap<object, string>();
  let disposed = false;

  function isDefaultExpanded(row: Row, id: string): boolean {
    if (defaultIds) return defaultIds.has(id);
    if (typeof options.defaultExpanded === "function") return options.defaultExpanded(row);
    return options.defaultExpanded === true;
  }

  function build(nextRoots: readonly Row[], loadedOverride?: ReadonlyMap<string, readonly Row[]>): BuiltHierarchy<Row> {
    const acceptedRoots = validatedRows(nextRoots, "Hierarchy roots");
    const descriptors = new Map<string, NodeDescriptor<Row>>();
    const seen = new Set<string>();
    const nextObjectIds: { readonly row: Row; readonly id: string }[] = [];
    const ancestors = new Set<Row>();
    function visit(rows: readonly Row[], parentId: string | null, depth: number): readonly string[] {
      const ids: string[] = [];
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index]!;
        if (ancestors.has(row)) throw new Error("Row hierarchy contains an object cycle");
        const id = options.getRowId(row);
        if (typeof id !== "string" || !id.trim() || id.trim() !== id) throw new Error(`Hierarchy row at depth ${depth} position ${index + 1} has an invalid ID`);
        if (seen.has(id)) throw new Error(`Duplicate hierarchy row ID: ${id}`);
        seen.add(id);
        const remembered = objectIds.get(row);
        if (remembered !== undefined && remembered !== id) throw new Error(`Hierarchy row identity changed from ${remembered} to ${id}`);
        nextObjectIds.push({ row, id });
        ancestors.add(row);
        const staticValue = options.getChildren?.(row);
        const hasStaticChildren = staticValue !== undefined;
        const childRows = hasStaticChildren
          ? validatedRows(staticValue, `Children of ${id}`)
          : loadedOverride?.get(id) ?? states.get(id)?.loaded;
        const acceptedChildren = childRows === undefined ? undefined : validatedRows(childRows, `Children of ${id}`);
        const childIds = acceptedChildren === undefined ? undefined : visit(acceptedChildren, id, depth + 1);
        ancestors.delete(row);
        const loadable = !hasStaticChildren && childIds === undefined && Boolean(options.loadChildren && (options.canLoadChildren?.(row) ?? true));
        descriptors.set(id, Object.freeze({ id, row, parentId, depth, position: index + 1, setSize: rows.length, children: childIds, loadable, staticChildren: hasStaticChildren }));
        ids.push(id);
      }
      return Object.freeze(ids);
    }
    const nextRootIds = visit(acceptedRoots, null, 1);
    return { roots: acceptedRoots, rootIds: nextRootIds, descriptors, objectIds: Object.freeze(nextObjectIds) };
  }

  function apply(built: BuiltHierarchy<Row>, loadedOverride?: ReadonlyMap<string, readonly Row[]>): void {
    const retained = new Set(built.descriptors.keys());
    for (const [id, state] of states) {
      if (retained.has(id)) continue;
      state.token++;
      state.controller?.abort();
      states.delete(id);
    }
    for (const descriptor of built.descriptors.values()) {
      const existing = states.get(descriptor.id);
      if (existing) {
        Object.assign(existing, descriptor);
        if (descriptor.staticChildren) existing.loaded = undefined;
        else if (loadedOverride?.has(descriptor.id)) existing.loaded = loadedOverride.get(descriptor.id);
      } else {
        states.set(descriptor.id, {
          ...descriptor,
          expanded: isDefaultExpanded(descriptor.row, descriptor.id),
          pending: false,
          error: null,
          token: 0,
          controller: undefined,
          loaded: loadedOverride?.get(descriptor.id),
        });
      }
    }
    for (const entry of built.objectIds) objectIds.set(entry.row, entry.id);
    roots = built.roots;
    rootIds = built.rootIds;
  }

  function updateRoots(nextRoots: readonly Row[]): void {
    if (disposed) return;
    apply(build(nextRoots));
  }

  function snapshot(): readonly HierarchyRow<Row>[] {
    const visible: HierarchyRow<Row>[] = [];
    function append(ids: readonly string[]): void {
      for (const id of ids) {
        const state = states.get(id);
        if (!state) continue;
        const canExpand = Boolean(state.children?.length) || state.loadable || state.pending || state.error !== null;
        visible.push(Object.freeze({
          id: state.id,
          row: state.row,
          parentId: state.parentId,
          depth: state.depth,
          position: state.position,
          setSize: state.setSize,
          canExpand,
          expanded: canExpand && state.expanded,
          unloaded: state.children === undefined && state.loadable,
          pending: state.pending,
          error: state.error,
        }));
        if (state.expanded && state.children) append(state.children);
      }
    }
    append(rootIds);
    return Object.freeze(visible);
  }

  async function load(id: string): Promise<HierarchyLoadOutcome> {
    if (disposed) return "disposed";
    const state = states.get(id);
    const adapter = options.loadChildren;
    if (!state || !state.loadable || !adapter) return "unchanged";
    if (state.pending) return "busy";
    const token = ++state.token;
    const controller = new AbortController();
    state.controller = controller;
    state.pending = true;
    state.error = null;
    const row = state.row;
    try {
      const children = validatedRows(await adapter(row, controller.signal), `Loaded children of ${id}`);
      if (disposed) return "disposed";
      const current = states.get(id);
      if (!current || current.token !== token) return "superseded";
      const overrides = new Map<string, readonly Row[]>([[id, children]]);
      const built = build(roots, overrides);
      current.loaded = children;
      apply(built, overrides);
      const accepted = states.get(id);
      if (accepted) {
        accepted.pending = false;
        accepted.error = null;
        accepted.controller = undefined;
      }
      return "loaded";
    } catch (error) {
      if (disposed) return "disposed";
      const current = states.get(id);
      if (!current || current.token !== token) return "superseded";
      current.pending = false;
      current.error = error;
      current.controller = undefined;
      return "failed";
    }
  }

  function setExpanded(id: string, expanded: boolean): Promise<HierarchyLoadOutcome> {
    if (disposed) return Promise.resolve("disposed");
    const state = states.get(id);
    if (!state) return Promise.resolve("unchanged");
    const canExpand = Boolean(state.children?.length) || state.loadable || state.pending || state.error !== null;
    if (!canExpand) return Promise.resolve("unchanged");
    if (!expanded) {
      if (!state.expanded && !state.pending) return Promise.resolve("unchanged");
      state.expanded = false;
      if (state.pending) {
        state.token++;
        state.pending = false;
        const controller = state.controller;
        state.controller = undefined;
        controller?.abort();
      }
      return Promise.resolve("changed");
    }
    state.expanded = true;
    if (state.children !== undefined) return Promise.resolve("changed");
    return load(id);
  }

  function retry(id: string): Promise<HierarchyLoadOutcome> {
    if (disposed) return Promise.resolve("disposed");
    const state = states.get(id);
    if (!state || state.error === null) return Promise.resolve("unchanged");
    state.expanded = true;
    return load(id);
  }

  function reset(): void {
    for (const state of states.values()) {
      state.token++;
      state.controller?.abort();
    }
    states.clear();
    roots = Object.freeze([]);
    rootIds = Object.freeze([]);
  }

  return {
    updateRoots,
    getSnapshot: snapshot,
    setExpanded,
    retry,
    reset,
    dispose(): void { disposed = true; reset(); },
  };
}
