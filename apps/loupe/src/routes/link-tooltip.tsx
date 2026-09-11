import { Button, LinkTooltip, ThemeScope } from "@gemologic/sheen";
import { createSignal } from "solid-js";

export default function LinkTooltipFixture() {
  const [disabled, setDisabled] = createSignal(false);
  return <main><h1>Link tooltip</h1><Button onClick={() => setDisabled(value => !value)}>Toggle help</Button>
    <ThemeScope theme="paper" mode="light" direction="rtl">
      <LinkTooltip href="/link-tooltip#report" type="text/html" target="_blank" rel="noopener" content="Read the full report" tooltipDisabled={disabled()}>Report</LinkTooltip>
    </ThemeScope>
  </main>;
}
