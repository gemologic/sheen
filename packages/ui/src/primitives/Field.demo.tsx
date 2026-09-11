import { Field } from "./Field.tsx";
import type { FieldProps } from "./Field.tsx";
import metadata from "./Field.meta.ts";

export const controls = metadata.props;
export default function FieldDemo(props: FieldProps) { return <Field {...props} />; }
