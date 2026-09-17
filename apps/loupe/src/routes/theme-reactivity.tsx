import { Button, Input, NumberText, Popover, Select, Stack, ThemeScope, useNumberFormatter, useTheme } from "@gemologic/sheen";
import { createSignal } from "solid-js";

const options = Object.freeze([{ value: "first", label: "First option" }, { value: "second", label: "Second option" }]);

function ThemeForm(props: { readonly label: string }) {
  const theme = useTheme();
  const number = useNumberFormatter();
  const [draft, setDraft] = createSignal("Accepted draft");
  return <Popover trigger={`Open ${props.label} theme form`} title={`${props.label} theme form`} placement="bottom-start">
    <Stack gap="sm">
      <Input label={`${props.label} draft`} value={draft()} onInput={event => setDraft(event.currentTarget.value)} />
      <Select label={`${props.label} selection`} options={options} defaultValue="first" />
      <output aria-label={`${props.label} number`}>{number().format(12_345.5)}</output>
      <NumberText aria-label={`${props.label} formatted number`} value={12_345.5} format={{ minimumFractionDigits: 2 }} />
      <Button onClick={() => void theme.setTheme(theme.theme() === "obsidian" ? "graphite" : "obsidian")}>{props.label} theme</Button>
      <Button onClick={() => void theme.setAccent(theme.accent() === "jade" ? "violet" : "jade")}>{props.label} accent</Button>
      <Button onClick={() => void theme.setMode(theme.mode() === "dark" ? "light" : "dark")}>{props.label} mode</Button>
      <Button onClick={() => void theme.set({ locale: theme.state().locale === "en-US" ? "de-DE" : "en-US" })}>{props.label} locale</Button>
      <Button onClick={() => void theme.set({ direction: theme.state().direction === "ltr" ? "rtl" : "ltr" })}>{props.label} direction</Button>
    </Stack>
  </Popover>;
}

export default function ThemeReactivityFixture() {
  return <main>
    <h1>Independent theme axes and retained floating forms</h1>
    <ThemeForm label="Root" />
    <ThemeScope controllable class="loupe-theme-reactivity-scope"><ThemeForm label="Scoped" /></ThemeScope>
  </main>;
}
