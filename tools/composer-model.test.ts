import { describe, expect, it } from "vitest";
import { createComposerFixtures, defaultComposerDocument } from "../apps/loupe/src/composer/fixtures.ts";
import { composerRegion, composerRegionIds, readComposerDocument, reconcileComposerDocument, serializeComposerDocument } from "../apps/loupe/src/composer/model.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Expected a Composer object fixture");
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected a Composer array fixture");
  return value;
}

function mutableDocument(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(serializeComposerDocument(defaultComposerDocument));
  return record(parsed);
}

function mutableRegion(document: Record<string, unknown>, id: string): Record<string, unknown> {
  for (const value of array(document.regions)) {
    const region = record(value);
    if (region.id === id) return region;
  }
  throw new Error(`Missing Composer region ${id}`);
}

describe("Composer document model", () => {
  it("validates and serializes the polished starter deterministically", () => {
    const result = readComposerDocument(defaultComposerDocument);
    const serialized: unknown = JSON.parse(serializeComposerDocument(defaultComposerDocument));
    expect(result.ok).toBe(true);
    expect(serializeComposerDocument(defaultComposerDocument)).toBe(serializeComposerDocument(defaultComposerDocument));
    expect(serialized).toEqual(defaultComposerDocument);
  });

  it("rejects executable props, CSS, duplicate identities, and invalid nesting", () => {
    const unsafe = mutableDocument();
    array(mutableRegion(unsafe, "main-grid").nodes).push({
      type: "component",
      id: "records",
      component: "Button",
      props: { children: "Run", style: "color:red", onClick: "alert(1)" },
      children: [{ type: "component", id: "nested", component: "Text", props: { children: "Nope" }, children: [] }],
    });
    const result = readComposerDocument(unsafe);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(item => item.code)).toEqual(expect.arrayContaining(["duplicate-node", "invalid-prop", "invalid-parent"]));
  });

  it("rejects incompatible and duplicate AdminApp placement nodes", () => {
    const unsafe = mutableDocument();
    array(mutableRegion(unsafe, "topbar").nodes).push({ type: "placement", id: "placement-account-copy", zone: "account", target: "sidebar-footer" });
    const result = readComposerDocument(unsafe);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(item => item.code)).toEqual(expect.arrayContaining(["duplicate-placement", "invalid-parent"]));
  });

  it("migrates the legacy region map and preserves canonical region order", () => {
    const current = mutableDocument();
    const regions = Object.fromEntries(array(current.regions).map(value => {
      const region = record(value);
      if (typeof region.id !== "string") throw new Error("Expected a Composer region ID");
      return [region.id, array(region.nodes)];
    }));
    const result = readComposerDocument({ ...current, schemaVersion: 0, regions });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migratedFrom).toBe(0);
    expect(result.document.regions.map(region => region.id)).toEqual(composerRegionIds);
  });
});

describe("Composer fixture factories", () => {
  it("are deterministic and contain fixed, typed application pressure data", () => {
    const first = createComposerFixtures("northstar-v1");
    const second = createComposerFixtures("northstar-v1");
    expect(second.users).toEqual(first.users);
    expect(second.records).toEqual(first.records);
    expect(second.activity).toEqual(first.activity);
    expect([...second.chart.data.t]).toEqual([...first.chart.data.t]);
    expect([...second.chart.data.p99 ?? []]).toEqual([...first.chart.data.p99 ?? []]);
    expect(first.records).toHaveLength(96);
    expect(first.states.map(state => state.kind)).toEqual(["ready", "empty", "loading", "error", "permission"]);
    expect(Number.isNaN(first.chart.data.p99?.[29])).toBe(true);
  });

  it("changes generated fixture identities when the explicit seed changes", () => {
    expect(createComposerFixtures("first").records).not.toEqual(createComposerFixtures("second").records);
  });
});

describe("Composer iframe reconciliation", () => {
  it("preserves every node identity for a structurally equal cloned document", () => {
    const cloned: unknown = JSON.parse(serializeComposerDocument(defaultComposerDocument));
    const parsed = readComposerDocument(cloned);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const reconciled = reconcileComposerDocument(defaultComposerDocument, parsed.document);
    expect(reconciled).toBe(defaultComposerDocument);
  });

  it("replaces only a configured node and its ancestor chain", () => {
    const cloned: unknown = JSON.parse(serializeComposerDocument(defaultComposerDocument).replace("Northstar accounts", "Deployment records"));
    const parsed = readComposerDocument(cloned);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const reconciled = reconcileComposerDocument(defaultComposerDocument, parsed.document);
    expect(composerRegion(reconciled, "toolbar")).toBe(composerRegion(defaultComposerDocument, "toolbar"));
    expect(composerRegion(reconciled, "main-grid")).not.toBe(composerRegion(defaultComposerDocument, "main-grid"));
    expect(findNode(reconciled, "activity-card")).toBe(findNode(defaultComposerDocument, "activity-card"));
    expect(findNode(reconciled, "records")).not.toBe(findNode(defaultComposerDocument, "records"));
  });
});

function findNode(document: typeof defaultComposerDocument, id: string) {
  const visit = (nodes: readonly (typeof document.regions[number]["nodes"][number])[]): typeof document.regions[number]["nodes"][number] | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === "component") {
        const child = visit(node.children);
        if (child) return child;
      }
    }
    return undefined;
  };
  for (const region of document.regions) {
    const node = visit(region.nodes);
    if (node) return node;
  }
  return undefined;
}
