import { Heading, Resizable, ResizableHandle, ResizablePanel, Stack, Text } from "@gemologic/sheen";
import { createSignal } from "solid-js";

export default function ResizableRoute() {
  const [sizes, setSizes] = createSignal<readonly number[]>([0.35, 0.65]);
  const [saves, setSaves] = createSignal(0);
  return <main>
    <Stack>
      <Heading level={1}>Resizable</Heading>
      <Text>Server-known geometry stays stable through hydration and remains keyboard adjustable.</Text>
      <Resizable
        aria-label="Workspace split"
        style={{ height: "20rem", border: "1px solid var(--sheen-color-border)" }}
        sizes={sizes()}
        onSizesChange={setSizes}
        persistence={{
          initialSizes: [0.35, 0.65],
          save: () => { setSaves(value => value + 1); },
          onError: error => { throw error; },
        }}
      >
        <ResizablePanel index={0} panelId="files"><div style={{ padding: "var(--sheen-space-block-md)" }}>Files</div></ResizablePanel>
        <ResizableHandle index={0} label="Resize files and preview" />
        <ResizablePanel index={1} panelId="preview"><div style={{ padding: "var(--sheen-space-block-md)" }}>Preview</div></ResizablePanel>
      </Resizable>
      <output aria-label="Resizable sizes">{sizes().map(size => Math.round(size * 100)).join(" / ")}</output>
      <output aria-label="Resizable saves">{saves()}</output>
    </Stack>
  </main>;
}
