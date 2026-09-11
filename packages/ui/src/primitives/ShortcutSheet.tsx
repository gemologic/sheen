import { For, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import { Dialog } from "./Dialog.tsx";
import type { DialogProps } from "./Dialog.tsx";
import { Heading, Kbd, Text } from "./Typography.tsx";
import { useCharacterShortcuts, useShortcutBindings } from "./ShortcutProvider.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";

export type ShortcutSheetProps = Omit<DialogProps, "children">;

/** Generated inventory. The application owns opening; Dialog owns modal scope activation. */
export function ShortcutSheet(props: ShortcutSheetProps): JSX.Element {
  const bindings = useShortcutBindings();
  const characters = useCharacterShortcuts();
  const theme = useTheme();
  const records = createMemo(() => new Map(bindings().map(binding => [binding.id, binding])));
  const groups = createMemo(() => [...new Set(bindings().map(binding => binding.group))]);
  return <Dialog {...props}>
    <Text>{theme.messages().shortcutInventory}</Text>
    <Show when={bindings().length} fallback={<Text>{theme.messages().noResults}</Text>}>
      <For each={groups()}>{group => <section>
        <Heading level={3}>{group}</Heading>
        <dl class="sheen-shortcut-bindings">
          <For each={bindings().filter(binding => binding.group === group).map(binding => binding.id)}>{id => <Show when={records().get(id)}>{binding => <div>
            <dt><Text>{binding().label}</Text><Text tone="muted">{binding().scope}</Text></dt>
            <dd><Kbd>{binding().displayKeys}</Kbd>
              <Show when={binding().shadowed}><Text tone="muted">{theme.messages().shortcutShadowed}</Text></Show>
              <Show when={binding().characterOnly && !characters()}><Text tone="muted">{theme.messages().shortcutDisabled}</Text></Show>
            </dd>
          </div>}</Show>}</For>
        </dl>
      </section>}</For>
    </Show>
  </Dialog>;
}
