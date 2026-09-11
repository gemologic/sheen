import { createSignal } from "solid-js";
import { Button, Stack, Textarea, ThemeScope } from "@gemologic/sheen";

export default function TextareaFixture() {
  const [value, setValue] = createSignal("\nInitial notes");
  const [auto, setAuto] = createSignal(true);
  const [narrow, setNarrow] = createSignal(false);
  const [compact, setCompact] = createSignal(false);
  return <main>
    <h1>Textarea sizing</h1>
    <Button onClick={() => setAuto(value => !value)}>Toggle autosize</Button>
    <Button onClick={() => setNarrow(value => !value)}>Toggle width</Button>
    <Button onClick={() => setCompact(value => !value)}>Toggle density</Button>
    <Button onClick={() => setValue("Updated by app\nSecond line\nThird line\nFourth line")}>Replace notes</Button>
    <ThemeScope density={compact() ? "compact" : "comfortable"}>
      <Stack style={{ "inline-size": narrow() ? "250px" : "700px" }}>
        <Textarea label="Growing notes" description="Up to the configured height, then scroll." value={value()} onInput={event => setValue(event.currentTarget.value)} autoResize={auto()} rows={2} style={{ "max-block-size": "200px" }} />
        <form aria-label="Textarea reset">
          <Textarea label="Reset notes" autoResize rows={2} />
          <Button type="reset">Reset notes</Button>
        </form>
      </Stack>
    </ThemeScope>
  </main>;
}
