import { createSignal } from "solid-js";
import { Button, Popover, Stack, TooltipTrigger } from "@gemologic/sheen";

export default function OverlayTriggersFixture() {
  const [archived, setArchived] = createSignal(0);
  const [locked, setLocked] = createSignal(true);
  return <main><h1>Overlay trigger qualification</h1><Stack>
    <span id="archive-help">Archived rows stay restorable.</span>
    <TooltipTrigger content="Archive the selected rows" shortcut="mod+e" aria-describedby="archive-help">
      {trigger => <Button {...trigger} variant="outline" onClick={() => setArchived(value => value + 1)}>Archive rows</Button>}
    </TooltipTrigger>
    <output aria-label="Archived count">{archived()}</output>
    <TooltipTrigger content="Copy the row link">{trigger => <button type="button" {...trigger}>Copy link</button>}</TooltipTrigger>
    <Button onClick={() => setLocked(value => !value)}>Toggle export lock</Button>
    <Popover title="Export options" trigger="Export options" disabled={locked()}>Choose a format.</Popover>
  </Stack></main>;
}
