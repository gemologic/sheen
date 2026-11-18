import { Form, FormActions, FormSection } from "./Form.tsx";
import type { FormProps } from "./Form.tsx";
import { Button } from "./Button.tsx";
import { Input } from "./Input.tsx";
import metadata from "./Form.meta.ts";

export const controls = metadata.props;
export default function FormDemo(props: FormProps) {
  return <Form {...props} onSubmit={props.onSubmit ?? (() => new Promise<void>(resolve => setTimeout(resolve, 600)))}>
    <FormSection title="Profile" description="Shown to teammates on comments and audit entries.">
      <Input label="Display name" name="name" required />
      <Input label="Email" name="email" type="email" required />
    </FormSection>
    <FormSection title="Notifications" description="Where incident updates are delivered.">
      <Input label="Webhook URL" name="webhook" type="url" />
    </FormSection>
    <FormActions><Button type="reset">Discard</Button><Button type="submit" variant="solid" tone="accent">Save changes</Button></FormActions>
  </Form>;
}
