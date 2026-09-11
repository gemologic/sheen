import { Button, Dialog, ThemeScope, useDateFormatter, useNumberFormatter, useTheme } from "@gemologic/sheen";

function Example() {
  const number = useNumberFormatter({ maximumFractionDigits: 2 });
  const date = useDateFormatter({ timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" });
  const theme = useTheme();
  return <div>
    <Button variant="solid" tone="accent" onClick={() => void theme.set({ density: "spacious", radius: "round", motion: "full", direction: "ltr", locale: "en-US" })}>Change modifiers</Button>
    <p data-number>{number().format(12345.67)}</p>
    <p data-date>{date().format(Date.UTC(2026, 8, 6))}</p>
    <Dialog title="Localized dialog" trigger="Open localized dialog"><p>Scoped messages</p></Dialog>
  </div>;
}

export default function ModifierFixture() {
  return <main><h1>Modifier contract</h1>
    <ThemeScope theme="paper" mode="light" density="compact" radius="sharp" motion="reduced" direction="rtl" locale="de-DE" messages={{ close: "Schließen" }} controllable class="modifier-scope">
      <Example />
      <ThemeScope theme="obsidian" mode="dark" density="comfortable" radius="soft" motion="full" class="modifier-reset"><Button>Reset control</Button></ThemeScope>
    </ThemeScope>
  </main>;
}
