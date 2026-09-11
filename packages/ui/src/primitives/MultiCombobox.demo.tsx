import { MultiCombobox } from "./Combobox.tsx";
import type { MultiComboboxProps } from "./Combobox.tsx";
import metadata from "./MultiCombobox.meta.ts";

export const controls = metadata.props;
export default function MultiComboboxDemo(props: MultiComboboxProps = { label: "Owners", options: [{ value: "ada", label: "Ada" }, { value: "grace", label: "Grace" }], defaultValue: ["ada"] }) { return <MultiCombobox {...props} />; }
