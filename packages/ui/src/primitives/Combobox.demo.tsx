import { Combobox } from "./Combobox.tsx";
import type { ComboboxProps } from "./Combobox.tsx";
import metadata from "./Combobox.meta.ts";

export const controls = metadata.props;
export default function ComboboxDemo(props: ComboboxProps = { label: "Owner", options: [{ value: "ada", label: "Ada" }, { value: "grace", label: "Grace" }], defaultValue: "ada" }) { return <Combobox {...props} />; }
