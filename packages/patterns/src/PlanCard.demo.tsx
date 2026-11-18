import { PlanCard } from "./PricingTable.tsx";
import type { PlanCardProps } from "./PricingTable.tsx";
import metadata from "./PlanCard.meta.ts";

export const controls = metadata.props;
export default function PlanCardDemo(props: PlanCardProps) { return <PlanCard {...props} />; }
