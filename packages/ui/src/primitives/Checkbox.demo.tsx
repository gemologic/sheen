import { Checkbox } from "./Checkbox.tsx";
import type { CheckboxProps } from "./Checkbox.tsx";
import metadata from "./Checkbox.meta.ts";

export const controls = metadata.props;
export default function CheckboxDemo(props: CheckboxProps = { label: "Receive alerts" }) { return <Checkbox {...props} />; }
