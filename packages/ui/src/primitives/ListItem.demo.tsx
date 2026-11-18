import { List, ListItem } from "./List.tsx";
import type { ListItemProps } from "./List.tsx";
import metadata from "./ListItem.meta.ts";

export const controls = metadata.props;
export default function ListItemDemo(props: Partial<ListItemProps>) {
  return <List label="Incidents"><ListItem description="Opened 12 minutes ago" href="#incident-42" {...props} title={props.title ?? "Checkout latency"} /></List>;
}
