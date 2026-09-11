import { RadioGroup } from "./RadioGroup.tsx";
import type { RadioGroupProps } from "./RadioGroup.tsx";
import metadata from "./RadioGroup.meta.ts";

export const controls = metadata.props;
export default function RadioGroupDemo(props: RadioGroupProps = { label: "Refresh cadence", name: "cadence", options: [{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }] }) { return <RadioGroup {...props} />; }
