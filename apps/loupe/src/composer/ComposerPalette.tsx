import { Button, Heading, SearchInput, Stack, Text } from "@gemologic/sheen";
import { For, createMemo, createSignal } from "solid-js";
import type { ComposerComponentName } from "./model.ts";
import { composerCatalog } from "./catalog.ts";

export interface ComposerPaletteProps {
  readonly onChoose: (component: ComposerComponentName) => void;
}

export default function ComposerPalette(props: ComposerPaletteProps) {
  const [query, setQuery] = createSignal("");
  const visible = createMemo(() => {
    const normalized = query().trim().toLocaleLowerCase("en-US");
    return normalized ? composerCatalog.filter(entry => `${entry.label} ${entry.summary}`.toLocaleLowerCase("en-US").includes(normalized)) : composerCatalog;
  });
  return <aside class="loupe-composer-palette" aria-labelledby="composer-palette-heading" data-composer-palette>
    <Stack gap="sm">
      <Heading id="composer-palette-heading" level={2} size="h4">Components</Heading>
      <SearchInput label="Filter components" value={query()} onValueChange={setQuery} />
      <div class="loupe-composer-palette-list">
        <For each={visible()}>{entry => <article data-composer-palette-component={entry.component}>
          <div><strong>{entry.label}</strong><Text size="caption" tone="muted">{entry.summary}</Text></div>
          <Button size="sm" onClick={() => props.onChoose(entry.component)}>Add</Button>
          <Button size="xs" class="loupe-composer-palette-drag" data-composer-palette-drag aria-label={`Drag ${entry.label} into preview`}>Drag</Button>
        </article>}</For>
      </div>
    </Stack>
  </aside>;
}
