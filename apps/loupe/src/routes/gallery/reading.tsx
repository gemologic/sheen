import { For } from "solid-js";
import { Badge, Card, Code, Heading, Input, Link, Stack, Text } from "@gemologic/sheen";
import { GalleryScenario } from "../../gallery-scenario.tsx";

const sections = [
  { id: "continuity", title: "Continuity before novelty", paragraphs: ["A refresh is a data transition, not a cue to dismantle the interface. Accepted content stays readable while the next result is pending.", "Stable owners preserve focus, text selection, scroll anchors, and local drafts. The pending state belongs beside the content it qualifies."] },
  { id: "hydration", title: "Hydration is ownership handoff", paragraphs: ["The server and client must agree on structure and initial semantics. Client-only preferences need a deliberate prepaint or loading boundary.", "A dark-default document may still honor a stored light preference before first paint. The provider owns that root contract; nested scopes inherit without persistence side effects."] },
  { id: "tables", title: "Tables choose an honest data contract", paragraphs: ["Pagination gives remote or review-oriented data stable landmarks. Continuous mode is appropriate for a complete bounded local result and still requires virtualization.", "Export, selection, and filtering operate on the accepted dataset contract, never merely the rows currently mounted in the viewport."] },
] as const;

export default function ReadingGallery() {
  return <GalleryScenario path="/gallery/reading" title="Design-system notebook" description="Long-form reading, navigation, code, annotations, and stable accepted revisions." emptyHeading="Notebook is empty" emptyDescription="No published notes are available.">
    {revision => <div class="loupe-gallery-reading-layout">
      <nav aria-label="Notebook contents"><Stack gap="sm"><Heading level={2} size="h4">Contents</Heading><For each={sections}>{section => <Link href={`#${section.id}`}>{section.title}</Link>}</For></Stack></nav>
      <article class="loupe-gallery-reading-article">
        <Stack gap="xl">
          <div><Badge tone="neutral">Revision {revision()}</Badge><Heading level={2}>Interfaces that survive change</Heading><Text tone="muted">A compact field guide to data refresh and hydration boundaries.</Text></div>
          <Input label="Retained margin note" placeholder="Annotate before refreshing" />
          <For each={sections}>{section => <section id={section.id}><Heading level={3}>{section.title}</Heading><For each={section.paragraphs}>{paragraph => <Text>{paragraph}</Text>}</For></section>}</For>
          <Card><Stack><Heading level={3} size="h4">Invariant</Heading><Code>accepted UI + explicit pending state + stable owner</Code></Stack></Card>
        </Stack>
      </article>
    </div>}
  </GalleryScenario>;
}
