import { FocusedAuthLayout } from "./AuthLayout.tsx";
import type { FocusedAuthLayoutProps } from "./AuthLayout.tsx";
import metadata from "./FocusedAuthLayout.meta.ts";

export const controls = metadata.props;
export default function FocusedAuthLayoutDemo(props: FocusedAuthLayoutProps) { return <FocusedAuthLayout {...props} />; }
