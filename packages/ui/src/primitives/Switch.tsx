import type { JSX } from "solid-js";
import { createNativeBooleanControl } from "./Checkbox.tsx";
import type { BooleanControlBaseProps, BooleanControlName } from "./Checkbox.tsx";

export type SwitchProps = Omit<BooleanControlBaseProps, "indeterminate"> & BooleanControlName;

export function Switch(props: SwitchProps): JSX.Element {
  return createNativeBooleanControl(props, "switch");
}
