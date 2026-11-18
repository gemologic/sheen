import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Form, FormActions, FormSection } from "./Form.tsx";

describe("Form scaffolding SSR", () => {
  it("renders a native form with headed sections and an action row", () => {
    const html = renderToString(() => <Form id="settings" method="post">
      <FormSection title="Profile" description="Shown to teammates."><input name="name" /></FormSection>
      <FormActions sticky align="between"><button type="submit">Save</button></FormActions>
    </Form>);
    expect(html).toMatch(/<form[^>]*method="post"/);
    expect(html).toMatch(/<h2[^>]*class="sheen-form-section-title"[^>]*>Profile/);
    expect(html).toContain("Shown to teammates.");
    expect(html).toContain("data-sticky");
    expect(html).toContain('data-align="between"');
    expect(html).not.toContain("aria-busy");
  });
});
