import { Button, EditableTextField, Heading, Row, Stack, Text } from "@gemologic/sheen";
import { createSignal } from "solid-js";

export default function EditableTextRoute() {
  const [value, setValue] = createSignal("North star");
  const [commits, setCommits] = createSignal(0);
  return <main><Stack>
    <Heading level={1}>Editable text</Heading>
    <Text>The input owns only its active draft. The app owns every committed value.</Text>
    <EditableTextField id="project-name" value={value()} label="Project name"
      validate={draft => draft.trim().length < 3 ? "Use at least three characters." : undefined}
      onCommit={draft => { setValue(draft); setCommits(count => count + 1); }} />
    <Row><Button onClick={() => setValue("Server revision")}>Refresh committed value</Button></Row>
    <output aria-label="Committed text">{value()}</output>
    <output aria-label="Commit count">{commits()}</output>
  </Stack></main>;
}
