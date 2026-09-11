import { ListDetailLayout } from "./ListDetailLayout.tsx";
import type { ListDetailLayoutProps } from "./ListDetailLayout.tsx";
import metadata from "./ListDetailLayout.meta.ts";

export const controls = metadata.props;

export default function ListDetailLayoutDemo(props: ListDetailLayoutProps) {
  return <ListDetailLayout {...props} />;
}
