import { PricingTable } from "./PricingTable.tsx";
import type { PricingTableProps } from "./PricingTable.tsx";
import metadata from "./PricingTable.meta.ts";

export const controls = metadata.props;
export default function PricingTableDemo(props: PricingTableProps) { return <PricingTable {...props} />; }
