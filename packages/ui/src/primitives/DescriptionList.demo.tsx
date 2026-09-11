import { DescriptionList, DescriptionTerm, DescriptionDetails } from "./DescriptionList.tsx";
import type { DescriptionListProps } from "./DescriptionList.tsx";
import metadata from "./DescriptionList.meta.ts";

export const controls = metadata.props;
export default function DescriptionListDemo(props: DescriptionListProps) { return <DescriptionList {...props}>{props.children ?? <><DescriptionTerm>Symbol</DescriptionTerm><DescriptionDetails>BTC</DescriptionDetails></>}</DescriptionList>; }
