import { Button, Heading, useTheme } from "@gemologic/sheen";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useUnsavedChanges } from "./unsaved-changes.ts";

export interface SettingsLayoutSection {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly content: JSX.Element;
}

export interface SettingsLayoutProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly label: string;
  readonly sections: readonly SettingsLayoutSection[];
  readonly activeSection?: string;
  readonly onSectionChange?: (id: string) => void;
  readonly sectionHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly dirty: boolean;
  readonly onSave: () => void | Promise<void>;
  readonly onDiscard?: () => void;
  readonly saveError?: string | null;
}

interface ValidatedSection {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly content: JSX.Element;
}

function validateSections(value: readonly SettingsLayoutSection[]): readonly ValidatedSection[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("SettingsLayout requires at least one section");
  const ids = new Set<string>();
  const sections = value.map((section, index) => {
    if (typeof section !== "object" || section === null || Array.isArray(section)) throw new Error(`SettingsLayout section ${index} must be an object`);
    if (typeof section.id !== "string" || !/^[A-Za-z][A-Za-z0-9._:-]*$/u.test(section.id) || ids.has(section.id)) throw new Error("SettingsLayout section IDs must be unique HTML-safe identifiers");
    ids.add(section.id);
    if (typeof section.label !== "string" || !section.label.trim()) throw new Error(`SettingsLayout section ${section.id} requires a nonempty label`);
    if (section.description !== undefined && (typeof section.description !== "string" || !section.description.trim())) throw new Error(`SettingsLayout section ${section.id} has an empty description`);
    return Object.freeze({ id: section.id, label: section.label, ...(section.description === undefined ? {} : { description: section.description }), content: section.content });
  });
  return Object.freeze(sections);
}

export function SettingsLayout(props: SettingsLayoutProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["label", "sections", "activeSection", "onSectionChange", "sectionHeadingLevel", "dirty", "onSave", "onDiscard", "saveError", "class"]);
  const prefix = createUniqueId();
  const sectionElements = new Map<string, HTMLElement>();
  const sections = createMemo(() => validateSections(local.sections));
  const ids = createMemo(() => sections().map(section => section.id));
  const [activeDraft, setActiveDraft] = createSignal<string>();
  const [pending, setPending] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  let disposed = false;
  const label = createMemo(() => {
    if (typeof local.label !== "string" || !local.label.trim()) throw new Error("SettingsLayout requires a nonempty label");
    return local.label;
  });
  const dirty = createMemo(() => {
    if (typeof local.dirty !== "boolean") throw new Error("SettingsLayout dirty must be boolean");
    return local.dirty;
  });
  const active = createMemo(() => {
    const requested = local.activeSection ?? activeDraft() ?? ids()[0];
    if (requested === undefined || !ids().includes(requested)) throw new Error("SettingsLayout activeSection must identify a current section");
    return requested;
  });
  const error = createMemo(() => {
    const value = local.saveError;
    if (value !== undefined && value !== null && (typeof value !== "string" || !value.trim())) throw new Error("SettingsLayout saveError must be a nonempty string");
    return value ?? (failed() ? theme.messages().saveFailed : null);
  });
  createEffect(() => {
    const available = ids();
    for (const id of sectionElements.keys()) if (!available.includes(id)) sectionElements.delete(id);
    const draft = activeDraft();
    if (local.activeSection === undefined && draft !== undefined && !available.includes(draft)) setActiveDraft(available[0]);
  });
  createEffect(() => { if (!dirty()) setFailed(false); });
  useUnsavedChanges(dirty);
  onCleanup(() => { disposed = true; sectionElements.clear(); });
  const activate = (id: string) => {
    if (local.activeSection === undefined) setActiveDraft(id);
    local.onSectionChange?.(id);
    sectionElements.get(id)?.scrollIntoView({ block: "start" });
  };
  const save = async () => {
    if (!dirty() || pending()) return;
    if (typeof local.onSave !== "function") throw new Error("SettingsLayout onSave must be a function");
    setFailed(false);
    setPending(true);
    try { await local.onSave(); }
    catch { if (!disposed) setFailed(true); }
    finally { if (!disposed) setPending(false); }
  };
  const discard = () => {
    if (pending()) return;
    if (local.onDiscard !== undefined && typeof local.onDiscard !== "function") throw new Error("SettingsLayout onDiscard must be a function");
    local.onDiscard?.();
  };
  const status = () => error() ?? (pending() ? theme.messages().savingChanges : dirty() ? theme.messages().unsavedChanges : "");
  return <div {...others} class={`sheen-settings-layout ${local.class ?? ""}`} role="group" aria-label={label()} data-dirty={dirty()} data-pending={pending() || undefined}>
    <div class="sheen-settings-layout-body">
      <nav class="sheen-settings-nav" aria-label={theme.messages().settingsSections}>
        <ul><For each={ids()}>{id => <li><Button variant="ghost" class="sheen-settings-nav-button" aria-current={active() === id ? "location" : undefined} aria-controls={`${prefix}-${id}`} onClick={() => activate(id)}>{sections().find(section => section.id === id)?.label}</Button></li>}</For></ul>
      </nav>
      <div class="sheen-settings-sections">
        <For each={ids()}>{id => {
          const section = () => sections().find(candidate => candidate.id === id);
          return <section ref={element => { sectionElements.set(id, element); }} id={`${prefix}-${id}`} class="sheen-settings-section" data-section-id={id} aria-labelledby={`${prefix}-${id}-heading`}>
            <Heading id={`${prefix}-${id}-heading`} level={local.sectionHeadingLevel ?? 2} size="h4">{section()?.label}</Heading>
            <Show when={section()?.description}>{description => <p class="sheen-settings-section-description">{description()}</p>}</Show>
            <div class="sheen-settings-section-content">{section()?.content}</div>
          </section>;
        }}</For>
      </div>
    </div>
    <div class="sheen-settings-save-bar" role="group" aria-label={theme.messages().settingsSaveBar}>
      <output class="sheen-settings-save-status" aria-live="polite" data-error={Boolean(error()) || undefined}>{status()}</output>
      <Show when={local.onDiscard}><Button disabled={!dirty() || pending()} onClick={discard}>{theme.messages().discardChanges}</Button></Show>
      <Button variant="solid" tone="accent" loading={pending()} disabled={!dirty()} onClick={() => { void save(); }}>{theme.messages().saveChanges}</Button>
    </div>
  </div>;
}
