import { FormActions } from "./Form.tsx";
import type { FormActionsProps } from "./Form.tsx";
import { Button } from "./Button.tsx";
import metadata from "./FormActions.meta.ts";

export const controls = metadata.props;
export default function FormActionsDemo(props: FormActionsProps) {
  return <FormActions {...props}><Button type="reset">Discard</Button><Button type="submit" variant="solid" tone="accent">Save changes</Button></FormActions>;
}
