import { PageHeader } from "./PageHeader.tsx";
import type { PageHeaderProps } from "./PageHeader.tsx";
import metadata from "./PageHeader.meta.ts";
export const controls = metadata.props;
export default function PageHeaderDemo(props: PageHeaderProps) { return <PageHeader {...props} />; }
