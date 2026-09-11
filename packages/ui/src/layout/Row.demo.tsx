import { Row } from "./Layout.tsx";
import type { RowProps } from "./Layout.tsx";
import metadata from "./Row.meta.ts";

export const controls = metadata.props;
export default function RowDemo(props: RowProps) { return <Row {...props}>{props.children ?? <><span>First item</span><span>Second item</span></>}</Row>; }
