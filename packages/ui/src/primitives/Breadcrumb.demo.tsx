import { Breadcrumb } from "./Breadcrumb.tsx";
import type { BreadcrumbProps } from "./Breadcrumb.tsx";
import metadata from "./Breadcrumb.meta.ts";
export const controls = metadata.props;
export default function BreadcrumbDemo(props: BreadcrumbProps) { return <Breadcrumb {...props} />; }
