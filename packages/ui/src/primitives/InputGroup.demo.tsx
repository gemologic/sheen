import { InputGroup } from "./InputGroup.tsx";
import type { InputGroupProps } from "./InputGroup.tsx";
import metadata from "./InputGroup.meta.ts";

export const controls = metadata.props;
export default function InputGroupDemo(props: InputGroupProps) { return <InputGroup {...props} />; }
