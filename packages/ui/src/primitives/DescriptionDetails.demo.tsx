import { DescriptionList, DescriptionTerm, DescriptionDetails } from "./DescriptionList.tsx";
import type { DescriptionDetailsProps } from "./DescriptionList.tsx";
import metadata from "./DescriptionDetails.meta.ts";

export const controls = metadata.props;
export default function DescriptionDetailsDemo(props: DescriptionDetailsProps) { return <DescriptionList><DescriptionTerm>Quantity</DescriptionTerm><DescriptionDetails {...props}>{props.children ?? "1.25"}</DescriptionDetails></DescriptionList>; }
