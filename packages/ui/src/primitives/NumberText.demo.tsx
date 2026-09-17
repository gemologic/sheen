import { NumberText } from "./NumberText.tsx";
import type { NumberTextProps } from "./NumberText.tsx";
import metadata from "./NumberText.meta.ts";

export const controls = metadata.props;
export default function NumberTextDemo(props: NumberTextProps) { return <NumberText {...props} />; }
