import type { AdminAppearance, AdminChromeTarget, AdminChromeZone, AdminPreset } from "@gemologic/sheen-patterns/admin-config";
import { adminChromeZones, resolveAdminPlacements } from "@gemologic/sheen-patterns/admin-config";
import type { ComposerComponentNode, ComposerDocument, ComposerNode, ComposerRegion, ComposerRegionId, ComposerScalar } from "./model.ts";
import { composerRegionIds, readComposerDocument, serializeComposerDocument } from "./model.ts";

export interface ComposerDestination {
  readonly region: ComposerRegionId;
  readonly parentId?: string;
  readonly index: number;
}

export interface ComposerNodeLocation extends ComposerDestination {
  readonly node: ComposerNode;
}

export interface ComposerHistory {
  readonly past: readonly ComposerDocument[];
  readonly present: ComposerDocument;
  readonly future: readonly ComposerDocument[];
}

export interface ComposerDraftStorage {
  readonly get: (key: string) => string | null;
  readonly set: (key: string, value: string) => void;
  readonly remove: (key: string) => void;
}

/** Bound retained document snapshots so a long design session cannot grow forever. */
export const composerHistoryLimit = 100;

export type ComposerDraftReadResult =
  | { readonly kind: "empty" }
  | { readonly kind: "ready"; readonly document: ComposerDocument; readonly migratedFrom?: number }
  | { readonly kind: "corrupt"; readonly message: string }
  | { readonly kind: "unavailable"; readonly message: string };

function accepted(document: ComposerDocument): ComposerDocument {
  const result = readComposerDocument(document);
  if (!result.ok) throw new Error(result.errors.map(item => `${item.path}: ${item.message}`).join("\n"));
  return result.document;
}

function mapComponents(nodes: readonly ComposerNode[], visit: (node: ComposerComponentNode) => ComposerComponentNode): readonly ComposerNode[] {
  return nodes.map(node => node.type === "placement" ? node : visit({ ...node, children: mapComponents(node.children, visit).filter(child => child.type === "component") }));
}

function withRegions(document: ComposerDocument, change: (region: ComposerRegion) => ComposerRegion): ComposerDocument {
  return accepted({ ...document, regions: document.regions.map(change) });
}

function findInComponents(nodes: readonly ComposerNode[], id: string, region: ComposerRegionId, parentId?: string): ComposerNodeLocation | undefined {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (!node) continue;
    if (node.id === id) return { node, region, ...(parentId === undefined ? {} : { parentId }), index };
    if (node.type === "component") {
      const nested = findInComponents(node.children, id, region, node.id);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function findComposerNode(document: ComposerDocument, id: string): ComposerNodeLocation | undefined {
  for (const region of document.regions) {
    const found = findInComponents(region.nodes, id, region.id);
    if (found) return found;
  }
  return undefined;
}

function removeFromComponents(nodes: readonly ComposerNode[], id: string): { readonly nodes: readonly ComposerNode[]; readonly removed?: ComposerNode } {
  const direct = nodes.findIndex(node => node.id === id);
  if (direct >= 0) {
    const removed = nodes[direct];
    if (!removed) return { nodes };
    return { nodes: [...nodes.slice(0, direct), ...nodes.slice(direct + 1)], removed };
  }
  let removed: ComposerNode | undefined;
  const next = nodes.map(node => {
    if (node.type === "placement" || removed) return node;
    const result = removeFromComponents(node.children, id);
    if (!result.removed) return node;
    removed = result.removed;
    const children: ComposerComponentNode[] = [];
    for (const child of result.nodes) if (child.type === "component") children.push(child);
    return { ...node, children };
  });
  return { nodes: next, ...(removed === undefined ? {} : { removed }) };
}

function insertIntoComponents(nodes: readonly ComposerNode[], destination: ComposerDestination, node: ComposerNode): readonly ComposerNode[] {
  if (destination.parentId === undefined) {
    const index = Math.max(0, Math.min(destination.index, nodes.length));
    return [...nodes.slice(0, index), node, ...nodes.slice(index)];
  }
  let inserted = false;
  const result = mapComponents(nodes, candidate => {
    if (candidate.id !== destination.parentId) return candidate;
    const index = Math.max(0, Math.min(destination.index, candidate.children.length));
    if (node.type !== "component") throw new Error("Admin placement nodes cannot be nested");
    inserted = true;
    return { ...candidate, children: [...candidate.children.slice(0, index), node, ...candidate.children.slice(index)] };
  });
  if (!inserted) throw new Error(`Composer destination parent ${JSON.stringify(destination.parentId)} was not found`);
  return result;
}

function insertDocument(document: ComposerDocument, destination: ComposerDestination, node: ComposerNode): ComposerDocument {
  let inserted = false;
  const result = withRegions(document, region => {
    if (region.id !== destination.region) return region;
    inserted = true;
    return { ...region, nodes: insertIntoComponents(region.nodes, destination, node) };
  });
  if (!inserted) throw new Error(`Composer destination region ${JSON.stringify(destination.region)} was not found`);
  return result;
}

export function addComposerNode(document: ComposerDocument, destination: ComposerDestination, node: ComposerNode): ComposerDocument {
  if (findComposerNode(document, node.id)) throw new Error(`Composer node ID ${JSON.stringify(node.id)} already exists`);
  return insertDocument(document, destination, node);
}

export function removeComposerNode(document: ComposerDocument, id: string): ComposerDocument {
  const location = findComposerNode(document, id);
  if (!location) throw new Error(`Composer node ${JSON.stringify(id)} was not found`);
  if (location.node.type === "placement") throw new Error("Admin placement nodes cannot be removed; move the semantic zone instead");
  let removed = false;
  const result = withRegions(document, region => {
    if (region.id !== location.region) return region;
    const next = removeFromComponents(region.nodes, id);
    removed = next.removed !== undefined;
    return { ...region, nodes: next.nodes };
  });
  if (!removed) throw new Error(`Composer node ${JSON.stringify(id)} was not found`);
  return result;
}

export function moveComposerNode(document: ComposerDocument, id: string, destination: ComposerDestination): ComposerDocument {
  const location = findComposerNode(document, id);
  if (!location) throw new Error(`Composer node ${JSON.stringify(id)} was not found`);
  if (location.node.type === "placement") throw new Error("Use setComposerPlacement to move AdminApp zones");
  let removedNode: ComposerNode | undefined;
  const without = withRegions(document, region => {
    if (region.id !== location.region) return region;
    const result = removeFromComponents(region.nodes, id);
    removedNode = result.removed;
    return { ...region, nodes: result.nodes };
  });
  if (!removedNode) throw new Error(`Composer node ${JSON.stringify(id)} was not removed`);
  const sameParent = location.region === destination.region && location.parentId === destination.parentId;
  const adjusted = sameParent && location.index < destination.index
    ? { ...destination, index: destination.index - 1 }
    : destination;
  return insertDocument(without, adjusted, removedNode);
}

function nextDuplicateId(document: ComposerDocument, source: string): string {
  for (let copy = 2; copy < 10_000; copy++) {
    const id = `${source}-copy-${copy}`;
    if (!findComposerNode(document, id)) return id;
  }
  throw new Error(`Composer could not allocate a duplicate ID for ${JSON.stringify(source)}`);
}

function duplicateComponent(document: ComposerDocument, node: ComposerComponentNode): ComposerComponentNode {
  const id = nextDuplicateId(document, node.id);
  return { ...node, id, children: node.children.map(child => duplicateComponent(document, child)) };
}

export function duplicateComposerNode(document: ComposerDocument, id: string): ComposerDocument {
  const location = findComposerNode(document, id);
  if (!location) throw new Error(`Composer node ${JSON.stringify(id)} was not found`);
  if (location.node.type === "placement") throw new Error("Admin placement nodes occur once and cannot be duplicated");
  const duplicate = duplicateComponent(document, location.node);
  return insertDocument(document, { region: location.region, ...(location.parentId === undefined ? {} : { parentId: location.parentId }), index: location.index + 1 }, duplicate);
}

export function configureComposerNode(document: ComposerDocument, id: string, props: Readonly<Record<string, ComposerScalar>>): ComposerDocument {
  const location = findComposerNode(document, id);
  if (!location || location.node.type !== "component") throw new Error(`Composer component ${JSON.stringify(id)} was not found`);
  return withRegions(document, region => region.id !== location.region ? region : {
    ...region,
    nodes: mapComponents(region.nodes, node => node.id === id ? { ...node, props: { ...node.props, ...props } } : node),
  });
}

export function setComposerPlacement(document: ComposerDocument, zone: AdminChromeZone, target: AdminChromeTarget): ComposerDocument {
  const id = `placement-${zone}`;
  const location = findComposerNode(document, id);
  if (!location || location.node.type !== "placement") throw new Error(`Composer placement ${JSON.stringify(zone)} was not found`);
  const destinationRegion: ComposerRegionId = target.startsWith("topbar-") ? "topbar" : "sidebar";
  const moved: ComposerNode = { type: "placement", id, zone, target };
  let removed: ComposerNode | undefined;
  const regions = document.regions.map(region => {
    if (region.id !== location.region) return region;
    const result = removeFromComponents(region.nodes, id);
    removed = result.removed;
    return { ...region, nodes: result.nodes };
  }).map(region => region.id === destinationRegion ? { ...region, nodes: [...region.nodes, moved] } : region);
  if (!removed) throw new Error(`Composer placement ${JSON.stringify(zone)} could not be moved`);
  return accepted({ ...document, regions });
}

export function setComposerPreset(document: ComposerDocument, preset: AdminPreset): ComposerDocument {
  const placements = resolveAdminPlacements(preset);
  const content = document.regions.flatMap(region => region.nodes.filter(node => node.type === "component"));
  const regions = composerRegionIds.map((id): ComposerRegion => {
    if (id === "topbar" || id === "sidebar") {
      const nodes = adminChromeZones.filter(zone => (placements[zone].startsWith("topbar-") ? "topbar" : "sidebar") === id)
        .map(zone => ({ type: "placement", id: `placement-${zone}`, zone, target: placements[zone] } satisfies ComposerNode));
      return { id, nodes };
    }
    const current = document.regions.find(region => region.id === id);
    return { id, nodes: current?.nodes ?? [] };
  });
  if (!content.length) throw new Error("Composer preset change requires an accepted content document");
  return accepted({ ...document, preset, regions });
}

export function setComposerAppearance(document: ComposerDocument, appearance: AdminAppearance): ComposerDocument {
  return accepted({ ...document, appearance });
}

export function createComposerHistory(document: ComposerDocument): ComposerHistory {
  return Object.freeze({ past: Object.freeze([]), present: accepted(document), future: Object.freeze([]) });
}

export function commitComposerHistory(history: ComposerHistory, document: ComposerDocument): ComposerHistory {
  const next = accepted(document);
  if (serializeComposerDocument(next) === serializeComposerDocument(history.present)) return history;
  return Object.freeze({ past: Object.freeze([...history.past, history.present].slice(-composerHistoryLimit)), present: next, future: Object.freeze([]) });
}

export function undoComposerHistory(history: ComposerHistory): ComposerHistory {
  const present = history.past.at(-1);
  if (!present) return history;
  return Object.freeze({ past: Object.freeze(history.past.slice(0, -1)), present, future: Object.freeze([history.present, ...history.future].slice(0, composerHistoryLimit)) });
}

export function redoComposerHistory(history: ComposerHistory): ComposerHistory {
  const present = history.future[0];
  if (!present) return history;
  return Object.freeze({ past: Object.freeze([...history.past, history.present].slice(-composerHistoryLimit)), present, future: Object.freeze(history.future.slice(1)) });
}

export function readComposerDraft(storage: ComposerDraftStorage, key: string): ComposerDraftReadResult {
  try {
    const raw = storage.get(key);
    if (raw === null) return { kind: "empty" };
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch (cause) { return { kind: "corrupt", message: cause instanceof Error ? cause.message : "Draft JSON is corrupt" }; }
    const result = readComposerDocument(parsed);
    if (!result.ok) return { kind: "corrupt", message: result.errors.map(item => `${item.path}: ${item.message}`).join("\n") };
    return { kind: "ready", document: result.document, ...(result.migratedFrom === undefined ? {} : { migratedFrom: result.migratedFrom }) };
  } catch (cause) {
    return { kind: "unavailable", message: cause instanceof Error ? cause.message : "Draft storage is unavailable" };
  }
}

export function writeComposerDraft(storage: ComposerDraftStorage, key: string, document: ComposerDocument): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  try {
    storage.set(key, serializeComposerDocument(document));
    return { ok: true };
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "Draft storage is unavailable" };
  }
}

export function removeComposerDraft(storage: ComposerDraftStorage, key: string): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  try {
    storage.remove(key);
    return { ok: true };
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "Draft storage is unavailable" };
  }
}
