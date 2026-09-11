import { Pagination } from "./Pagination.tsx";
import type { PaginationProps } from "./Pagination.tsx";
import metadata from "./Pagination.meta.ts";
export const controls = metadata.props;
export default function PaginationDemo(props: PaginationProps) { return <Pagination {...props} />; }
