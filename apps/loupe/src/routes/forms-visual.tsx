import { For } from "solid-js";
import { Button, Grid, Input, InputGroup, SearchInput, Stack, Surface, Textarea, ThemeScope } from "@gemologic/sheen";
import type { ThemeScopeProps } from "@gemologic/sheen";

const configurations: Array<ThemeScopeProps & { name: string }> = [
  { name: "dark", theme: "obsidian", mode: "dark", density: "comfortable" },
  { name: "light", theme: "paper", mode: "light", density: "comfortable" },
  { name: "compact", theme: "obsidian", mode: "light", density: "compact" },
  { name: "contrast", theme: "contrast", mode: "light", density: "spacious" },
  { name: "rtl", theme: "obsidian", mode: "dark", density: "comfortable", direction: "rtl" },
];

export default function FormsVisualFixture() {
  return <main style={{ "block-size": "100%" }}>
    <h1>Form qualification</h1>
    <For each={configurations}>{configuration => <ThemeScope {...configuration} motion="reduced">
      <Surface padding="lg" data-form-sample={configuration.name}>
        <Stack>
          <h2>{configuration.name}</h2>
          <Grid columns={2} gap="lg">
            <Input label={`${configuration.name} account`} required placeholder="Account name" description="Visible label and supporting instructions." />
            <Input label={`${configuration.name} invalid account`} value="Unavailable" error="Choose another account name." description="The draft is preserved." />
            <Input label={`${configuration.name} disabled`} disabled value="Unavailable to edit" />
            <Input label={`${configuration.name} readonly`} readOnly value="Readable and selectable" />
            <InputGroup label={`${configuration.name} amount (USD)`} inputMode="decimal" startContent={<span aria-hidden="true">$</span>} endContent="USD" value="1,234.56" />
            <InputGroup label={`${configuration.name} reference`} placeholder="Reference" endContent={<Button>Look up</Button>} />
            <SearchInput label={`${configuration.name} search`} defaultValue="BTC" description="Clear acts only on this query." />
            <SearchInput label={`${configuration.name} empty search`} placeholder="Search orders" />
            <Textarea label={`${configuration.name} notes`} rows={3} autoResize value={"First line\nSecond line\nThird line\nFourth line"} description="Grows with content." />
            <Textarea label={`${configuration.name} invalid notes`} rows={3} value="Draft notes" error="Explain the requested change." />
          </Grid>
          <Button data-final-form-action>Save draft</Button>
        </Stack>
      </Surface>
    </ThemeScope>}</For>
  </main>;
}
