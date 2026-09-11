import { CheckboxGroup } from "./CheckboxGroup.tsx";
import type { CheckboxGroupProps } from "./CheckboxGroup.tsx";
import metadata from "./CheckboxGroup.meta.ts";

export const controls = metadata.props;
export default function CheckboxGroupDemo(props: CheckboxGroupProps = { label: "Alert channels", options: [{ value: "email", label: "Email" }, { value: "desktop", label: "Desktop" }] }) { return <CheckboxGroup {...props} />; }
