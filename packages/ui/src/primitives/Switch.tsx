import type { JSX } from "solid-js";
import { createNativeBooleanControl } from "./Checkbox.tsx";
import type { CheckboxProps } from "./Checkbox.tsx";

export type SwitchProps = Omit<CheckboxProps, "indeterminate">;

export function Switch(props: SwitchProps): JSX.Element {
  return createNativeBooleanControl(props, "switch");
}
