import { NumberField } from "./NumberField.tsx";
import type { NumberFieldProps } from "./NumberField.tsx";
import metadata from "./NumberField.meta.ts";

export const controls = metadata.props;
export default function NumberFieldDemo(props: NumberFieldProps = { label: "Budget", defaultValue: 1250.5, min: 0, formatOptions: { style: "currency", currency: "USD" } }) { return <NumberField {...props} />; }
