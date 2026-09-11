import { ChartDataTable } from "./ChartDataTable.tsx";
import type { ChartDataTableProps } from "./chart-types.ts";
import metadata from "./ChartDataTable.meta.ts";

export const controls = metadata.props;
export default function ChartDataTableDemo(props: ChartDataTableProps) { return <ChartDataTable {...props} />; }
