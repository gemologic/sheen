import { For } from "solid-js";
import { Grid, Select, Stack, Surface, ThemeScope } from "@gemologic/sheen";
import type { ThemeScopeProps } from "@gemologic/sheen";

const configurations: Array<ThemeScopeProps & { name: string }> = [
  { name: "dark", theme: "obsidian", mode: "dark" },
  { name: "light", theme: "paper", mode: "light" },
  { name: "compact", theme: "obsidian", mode: "light", density: "compact" },
  { name: "contrast", theme: "contrast", mode: "light", density: "spacious" },
  { name: "rtl", theme: "obsidian", mode: "dark", direction: "rtl" },
];
const options = [{ value: "live", label: "Live", description: "Continuous updates" }, { value: "paused", label: "Paused", disabled: true }, { value: "manual", label: "Manual" }];
export default function SelectVisualFixture() {
  return <main><h1>Select visual qualification</h1><For each={configurations}>{configuration =>
    <section data-select-sample={configuration.name}><ThemeScope {...configuration} motion="reduced">
      <Surface padding="lg" style={{ "min-block-size": "740px" }}><Stack>
        <h2>{configuration.name}</h2>
        <Grid columns={2} gap="lg">
          <Select label={`${configuration.name} selected`} options={options} defaultValue="manual" />
          <Select label={`${configuration.name} empty`} options={options} />
          <Select label={`${configuration.name} disabled`} options={options} defaultValue="live" disabled />
          <Select label={`${configuration.name} readonly`} options={options} defaultValue="live" readOnly />
          <Select label={`${configuration.name} invalid`} options={options} required error="Choose a cadence" />
          <Select label={`${configuration.name} popup`} options={options} defaultValue="live" description="Choose update frequency" />
        </Grid>
      </Stack></Surface>
    </ThemeScope></section>
  }</For></main>;
}
