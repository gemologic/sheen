import { DescriptionList, DescriptionTerm, DescriptionDetails } from "./DescriptionList.tsx";
import type { DescriptionTermProps } from "./DescriptionList.tsx";
import metadata from "./DescriptionTerm.meta.ts";

export const controls = metadata.props;
export default function DescriptionTermDemo(props: DescriptionTermProps) { return <DescriptionList><DescriptionTerm {...props}>{props.children ?? "Symbol"}</DescriptionTerm><DescriptionDetails>BTC</DescriptionDetails></DescriptionList>; }
