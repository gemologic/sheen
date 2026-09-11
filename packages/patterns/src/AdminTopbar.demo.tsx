import { AdminTopbar } from "./AdminTopbar.tsx";
import type { AdminTopbarProps } from "./AdminTopbar.tsx";
import metadata from "./AdminTopbar.meta.ts";
export const controls = metadata.props;
export default function AdminTopbarDemo(props: AdminTopbarProps) { return <AdminTopbar {...props} />; }
