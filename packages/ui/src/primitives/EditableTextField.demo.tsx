import { EditableTextField } from "./EditableTextField.tsx";
import type { EditableTextFieldProps } from "./EditableTextField.tsx";
import metadata from "./EditableTextField.meta.ts";

export const controls = metadata.props;
export default function EditableTextFieldDemo(props: EditableTextFieldProps) { return <EditableTextField {...props} />; }
