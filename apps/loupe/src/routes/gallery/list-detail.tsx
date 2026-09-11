import { For, Show, createMemo } from "solid-js";
import { Card, Heading, Input, Stack, Text } from "@gemologic/sheen";
import { AppShell, ListDetailLayout, resolveListDetailActive } from "@gemologic/sheen-patterns";
import type { ListDetailItem } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { GalleryScenario } from "../../gallery-scenario.tsx";

function createIssueItems(): readonly ListDetailItem[] {
  return Array.from({ length: 24 }, (_, index) => ({
    id: `issue-${index + 1}`,
    label: `SHEEN-${1200 + index}`,
    href: index === 0 ? "/gallery/list-detail" : `/gallery/list-detail?item=issue-${index + 1}`,
    description: index % 4 === 0 ? "Needs triage" : "Design-system adoption",
    trailing: index % 3 === 0 ? "Review" : "Ready",
  }));
}

export default function ListDetailGallery() {
  const router = useSolidRouterAdapter();
  const items = createIssueItems();
  const activeId = createMemo(() => resolveListDetailActive(items, router.location()) ?? items[0]?.id ?? null);
  const active = createMemo(() => items.find(item => item.id === activeId()));
  return <AppShell router={router} label="Issue gallery" header={<strong>Loupe issue scenario</strong>}><GalleryScenario insideShell path="/gallery/list-detail" title="Issue list and detail" description="Keyboard list navigation, retained detail state, and a responsive single-pane phone presentation." emptyHeading="No issues" emptyDescription="This view has no matching issues.">
    {revision => <ListDetailLayout router={router} items={items} listLabel="Issues" detailLabel="Issue details" listHref="/gallery/list-detail" backLabel="Back to issues" detailReady
      emptyDetail={<Text tone="muted">Choose an issue.</Text>} detail={<Show when={active()}>{item => <article class="loupe-gallery-issue" data-issue-id={item().id}>
        <Stack gap="lg">
          <div><Heading level={2}>{item().label}</Heading><Text tone="muted">Accepted revision {revision()}. Refresh changes data, not the detail owner.</Text></div>
          <Input label="Retained issue title" value={`${item().label} adoption follow-up`} />
          <Card><Stack><Heading level={3} size="h4">Acceptance notes</Heading><For each={[1, 2, 3, 4]}>{line => <Text>Line {line}: preserve focus, drafts, and pane scroll while newer data is pending.</Text>}</For></Stack></Card>
        </Stack>
      </article>}</Show>} />}
  </GalleryScenario></AppShell>;
}
