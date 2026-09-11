import { Row, Spacer } from "./Layout.tsx";
import type { SpacerProps } from "./Layout.tsx";
import metadata from "./Spacer.meta.ts";

export const controls = metadata.props;
export default function SpacerDemo(props: SpacerProps) { return <Row><span>Start</span><Spacer {...props} /><span>End</span></Row>; }
