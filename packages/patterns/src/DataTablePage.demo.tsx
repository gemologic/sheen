import { DataTablePage } from "./DataTablePage.tsx";
import type { DataTablePageProps } from "./DataTablePage.tsx";
import metadata from "./DataTablePage.meta.ts";

export const controls = metadata.props;

export default function DataTablePageDemo(props: DataTablePageProps) {
  return <DataTablePage {...props} />;
}
