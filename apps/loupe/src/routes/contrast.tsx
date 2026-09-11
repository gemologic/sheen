import { For, createSignal } from "solid-js";
import { Button, ThemeScope } from "@gemologic/sheen";
import { accents, isAccentName, themes } from "@gemologic/sheen-tokens";
import type { AccentName, Mode } from "@gemologic/sheen-tokens";

export default function ContrastFixture() {
  const [accent, setAccent] = createSignal<AccentName>("jade");
  const modes: Mode[] = ["dark", "light"];
  const surfaces = ["bg", "bg-subtle", "bg-raised", "bg-inset", "bg-hover", "bg-active", "bg-selected"];
  const tones: ("neutral" | "accent" | "danger" | "success")[] = ["neutral", "accent", "danger", "success"];
  return <main><h1>Contrast contract</h1>
    <label>Accent under test <select aria-label="Accent under test" value={accent()} onChange={event => { const value = event.currentTarget.value; if (isAccentName(value)) setAccent(value); }}>
      <For each={Object.keys(accents)}>{name => <option>{name}</option>}</For>
    </select></label>
    <For each={themes}>{theme => <For each={modes}>{mode => <ThemeScope theme={theme.id} mode={mode} accent={accent()} class="contrast-fixture">
      <h2>{theme.label} {mode}</h2>
      <For each={surfaces}>{surface => <section data-surface={surface} style={{ background: `var(--sheen-color-${surface})`, "--sheen-color-focus-ring-offset": `var(--sheen-color-${surface})`, padding: "var(--sheen-space-block-sm)" }}>
        <For each={tones}>{tone => <><Button tone={tone} variant="solid">{tone} solid</Button><Button tone={tone} variant="soft">{tone} soft</Button></>}</For>
      </section>}</For>
    </ThemeScope>}</For>}</For>
  </main>;
}
