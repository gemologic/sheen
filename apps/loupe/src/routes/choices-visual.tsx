import { For } from "solid-js";
import { Checkbox, CheckboxGroup, Grid, RadioGroup, Stack, Surface, Switch, ThemeScope } from "@gemologic/sheen";
import type { ThemeScopeProps } from "@gemologic/sheen";

const configurations: Array<ThemeScopeProps & { name: string }> = [
  { name: "dark", theme: "obsidian", mode: "dark", density: "comfortable" },
  { name: "light", theme: "paper", mode: "light", density: "comfortable" },
  { name: "compact", theme: "obsidian", mode: "light", density: "compact" },
  { name: "contrast", theme: "contrast", mode: "light", density: "spacious" },
  { name: "rtl", theme: "obsidian", mode: "dark", density: "comfortable", direction: "rtl" },
];

export default function ChoicesVisualFixture() {
  return <main style={{ "block-size": "100%" }}><h1>Choice control qualification</h1>
    <For each={configurations}>{configuration => <ThemeScope {...configuration} motion="reduced">
      <Surface padding="lg" data-choice-sample={configuration.name}>
        <Stack>
          <h2>{configuration.name}</h2>
          <Grid columns={2} gap="lg">
            <Checkbox label={`${configuration.name} unchecked`} description="Choose a value to include." />
            <Switch label={`${configuration.name} off`} description="Enable automatic updates." />
            <Checkbox label={`${configuration.name} checked`} defaultChecked />
            <Switch label={`${configuration.name} on`} defaultChecked />
            <Checkbox label={`${configuration.name} mixed`} indeterminate description="Some child rows are selected." />
            <Switch label={`${configuration.name} readonly switch`} readOnly defaultChecked />
            <Checkbox label={`${configuration.name} disabled checkbox`} disabled defaultChecked />
            <Switch label={`${configuration.name} disabled switch`} disabled defaultChecked />
            <Checkbox label={`${configuration.name} invalid checkbox`} required error="Confirm this choice." />
            <Switch label={`${configuration.name} invalid switch`} error="Connection unavailable." />
          </Grid>
          <Grid columns={2} gap="lg">
            <CheckboxGroup label={`${configuration.name} delivery channels`} options={[{ value: "email", label: "Email", description: "Inbox delivery" }, { value: "desktop", label: "Desktop" }, { value: "sms", label: "SMS", disabled: true }]} defaultValue={["email"]} description="Choose where alerts arrive." error="Choose another delivery channel." />
            <CheckboxGroup label={`${configuration.name} disabled channels`} options={[{ value: "email", label: "Email" }, { value: "desktop", label: "Desktop" }, { value: "sms", label: "SMS" }]} defaultValue={["desktop"]} disabled description="Managed by your administrator." />
          </Grid>
          <Grid columns={2} gap="lg">
            <RadioGroup label={`${configuration.name} cadence`} name={`${configuration.name}-cadence`} options={[{ value: "live", label: "Live", description: "Continuous updates" }, { value: "paused", label: "Paused", disabled: true }, { value: "manual", label: "Manual" }]} defaultValue="live" required description="Choose update frequency." error="Choose another cadence." />
            <RadioGroup label={`${configuration.name} horizontal cadence`} name={`${configuration.name}-horizontal`} options={[{ value: "live", label: "Live" }, { value: "daily", label: "Daily" }, { value: "manual", label: "Manual" }]} orientation="horizontal" />
            <RadioGroup label={`${configuration.name} disabled cadence`} name={`${configuration.name}-disabled`} options={[{ value: "live", label: "Live" }, { value: "daily", label: "Daily" }, { value: "manual", label: "Manual" }]} defaultValue="daily" disabled />
            <RadioGroup label={`${configuration.name} readonly cadence`} name={`${configuration.name}-readonly`} options={[{ value: "live", label: "Live" }, { value: "daily", label: "Daily" }, { value: "manual", label: "Manual" }]} defaultValue="manual" readOnly />
          </Grid>
          <p data-final-choice-content>Labels remain stable when settings change.</p>
        </Stack>
      </Surface>
    </ThemeScope>}</For>
  </main>;
}
