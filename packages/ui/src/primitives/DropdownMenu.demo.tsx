import { DropdownMenu } from "./DropdownMenu.tsx";
import metadata from "./DropdownMenu.meta.ts";
export const controls = metadata.props;
export default function Demo() {
  return <DropdownMenu trigger="Workspace actions" items={[{ kind: "action", id: "refresh", label: "Refresh", onSelect: () => {} }]} />;
}
