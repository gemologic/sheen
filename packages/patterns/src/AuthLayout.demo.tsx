import { AuthLayout } from "./AuthLayout.tsx";
import type { AuthLayoutProps } from "./AuthLayout.tsx";
import metadata from "./AuthLayout.meta.ts";

export const controls = metadata.props;
export default function AuthLayoutDemo(props: AuthLayoutProps) { return <AuthLayout {...props} />; }
