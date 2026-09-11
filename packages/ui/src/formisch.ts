import type { FieldStore, FormSchema, RequiredPath } from "@formisch/solid";
import type { JSX } from "solid-js";
import type { InputProps } from "./primitives/Input.tsx";

export type FormischInputBinding = Pick<InputProps, "name" | "value" | "error" | "autofocus" | "ref" | "onFocus" | "onInput" | "onChange" | "onBlur">;

function inputValue(value: unknown): string | number {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" && Number.isFinite(value)) return value;
  throw new Error("formischInputProps supports string and finite-number fields only");
}

/** Maps a Formisch field store to the controlled attributes consumed by Sheen Input. */
export function formischInputProps<TSchema extends FormSchema, TFieldPath extends RequiredPath>(field: FieldStore<TSchema, TFieldPath>): FormischInputBinding {
  const onInput: JSX.EventHandler<HTMLInputElement, InputEvent> = event => field.props.onInput(event);
  const onChange: JSX.EventHandler<HTMLInputElement, Event> = event => field.props.onChange(event);
  return {
    name: field.props.name,
    value: inputValue(field.input),
    ...(field.errors?.[0] === undefined ? {} : { error: field.errors[0] }),
    autofocus: field.props.autofocus,
    ref: element => field.props.ref(element),
    onFocus: () => field.props.onFocus(),
    onInput,
    onChange,
    onBlur: () => field.props.onBlur(),
  };
}
