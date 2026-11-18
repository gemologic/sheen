import { List, ListItem } from "./List.tsx";
import type { ListProps } from "./List.tsx";
import { Badge } from "./Status.tsx";
import metadata from "./List.meta.ts";

export const controls = metadata.props;
export default function ListDemo(props: ListProps) {
  return <List label="Incidents" {...props}>
    <ListItem href="#inc-42" current title="INC-42 · Public API latency" description="Investigating · Public API" trailing={<Badge tone="warning">SEV2</Badge>} />
    <ListItem onSelect={() => {}} title="INC-41 · Webhook retries" description="Mitigated · Webhooks" trailing="2h ago" />
    <ListItem title="INC-40 · Export queue backlog" description="Resolved · Exports" trailing="Yesterday" />
  </List>;
}
