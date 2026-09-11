import { BrandSplitAuthLayout } from "./AuthLayout.tsx";
import type { BrandSplitAuthLayoutProps } from "./AuthLayout.tsx";
import metadata from "./BrandSplitAuthLayout.meta.ts";

export const controls = metadata.props;
export default function BrandSplitAuthLayoutDemo(props: BrandSplitAuthLayoutProps) { return <BrandSplitAuthLayout {...props} />; }
