import { defaultThemeState, readThemeState } from "@gemologic/sheen";
import type { ThemeState } from "@gemologic/sheen";
import type { ComposerDestination, ComposerNodeLocation } from "./editor.ts";
import type { ComposerDocument, ComposerRegionId } from "./model.ts";
import { composerRegionIds, readComposerDocument } from "./model.ts";

export interface ComposerPreviewState {
  readonly document: ComposerDocument;
  readonly theme: ThemeState;
  readonly selectedId?: string;
  readonly focusId?: string;
  readonly revision: number;
}

export interface ComposerStateMessage {
  readonly kind: "sheen-composer-state";
  readonly state: ComposerPreviewState;
}

export interface ComposerReadyMessage {
  readonly kind: "sheen-composer-ready";
}

export interface ComposerSelectMessage {
  readonly kind: "sheen-composer-select";
  readonly id: string;
}

export interface ComposerDropMessage {
  readonly kind: "sheen-composer-drop";
  readonly sourceId: string;
  readonly destination: ComposerDestination;
}

export type ComposerPreviewMessage = ComposerReadyMessage | ComposerSelectMessage | ComposerDropMessage;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function region(value: unknown): value is ComposerRegionId {
  return typeof value === "string" && composerRegionIds.some(candidate => candidate === value);
}

export function readComposerStateMessage(value: unknown): ComposerPreviewState | undefined {
  if (!record(value) || value.kind !== "sheen-composer-state" || !record(value.state)) return undefined;
  const result = readComposerDocument(value.state.document);
  if (!result.ok || !Number.isSafeInteger(value.state.revision) || typeof value.state.revision !== "number") return undefined;
  if (value.state.selectedId !== undefined && typeof value.state.selectedId !== "string") return undefined;
  if (value.state.focusId !== undefined && typeof value.state.focusId !== "string") return undefined;
  return {
    document: result.document,
    theme: readThemeState(record(value.state.theme) ? value.state.theme : {}, defaultThemeState),
    ...(typeof value.state.selectedId === "string" ? { selectedId: value.state.selectedId } : {}),
    ...(typeof value.state.focusId === "string" ? { focusId: value.state.focusId } : {}),
    revision: value.state.revision,
  };
}

export function readComposerPreviewMessage(value: unknown): ComposerPreviewMessage | undefined {
  if (!record(value) || typeof value.kind !== "string") return undefined;
  if (value.kind === "sheen-composer-ready") return { kind: "sheen-composer-ready" };
  if (value.kind === "sheen-composer-select" && typeof value.id === "string" && value.id.trim()) return { kind: "sheen-composer-select", id: value.id };
  if (value.kind !== "sheen-composer-drop" || typeof value.sourceId !== "string" || !record(value.destination) || !region(value.destination.region)
    || !Number.isSafeInteger(value.destination.index) || typeof value.destination.index !== "number"
    || (value.destination.parentId !== undefined && typeof value.destination.parentId !== "string")) return undefined;
  return { kind: "sheen-composer-drop", sourceId: value.sourceId, destination: {
    region: value.destination.region,
    ...(typeof value.destination.parentId === "string" ? { parentId: value.destination.parentId } : {}),
    index: value.destination.index,
  } };
}

export function locationDestination(location: ComposerNodeLocation, offset = 0): ComposerDestination {
  return { region: location.region, ...(location.parentId === undefined ? {} : { parentId: location.parentId }), index: Math.max(0, location.index + offset) };
}
