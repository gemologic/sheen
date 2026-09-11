import { Select } from "./Select.tsx";
import type { SelectProps } from "./Select.tsx";
import metadata from "./Select.meta.ts";
export const controls = metadata.props;
export default function SelectDemo(props: SelectProps = { label: "Cadence", options: [{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }], defaultValue: "live" }) {
  return <Select {...props} />;
}
