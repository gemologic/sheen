import { FormSection } from "./Form.tsx";
import type { FormSectionProps } from "./Form.tsx";
import { Input } from "./Input.tsx";
import metadata from "./FormSection.meta.ts";

export const controls = metadata.props;
export default function FormSectionDemo(props: Partial<FormSectionProps>) {
  return <FormSection description="Shown to teammates on comments and audit entries." {...props} title={props.title ?? "Profile"}><Input label="Display name" name="name" /></FormSection>;
}
