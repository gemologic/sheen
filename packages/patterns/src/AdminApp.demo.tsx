import { AdminApp } from "./AdminApp.tsx";
import type { AdminAppProps } from "./AdminApp.tsx";
import metadata from "./AdminApp.meta.ts";
export const controls = metadata.props;
export default function AdminAppDemo(props: AdminAppProps) { return <AdminApp {...props} />; }
