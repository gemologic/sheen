import { CtaBand } from "./CtaBand.tsx";
import type { CtaBandProps } from "./CtaBand.tsx";
import metadata from "./CtaBand.meta.ts";

export const controls = metadata.props;
export default function CtaBandDemo(props: CtaBandProps) { return <CtaBand {...props} />; }
