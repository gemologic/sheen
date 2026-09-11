import { describe, expect, it } from "vitest";
import { Field as FormischField, createForm, setErrors } from "@formisch/solid";
import { renderToString } from "solid-js/web";
import * as v from "valibot";
import { Input } from "./primitives/Input.tsx";
import { formischInputProps } from "./formisch.ts";

const schema = v.object({ email: v.pipe(v.string(), v.email()) });

describe("formischInputProps", () => {
  it("binds a real Formisch field to Sheen Input during SSR", () => {
    function Fixture() {
      const form = createForm({ schema, initialInput: { email: "person@example.com" } });
      setErrors(form, { path: ["email"], errors: ["Already registered"] });
      return <FormischField of={form} path={["email"]}>{field => (
        <Input {...formischInputProps(field)} label="Email" type="email" />
      )}</FormischField>;
    }
    const html = renderToString(() => <Fixture />);
    expect(html).toContain('name="[&quot;email&quot;]"');
    expect(html).toContain('value="person@example.com"');
    expect(html).toContain("Already registered");
    expect(html).toContain('aria-invalid="true"');
  });

  it("fails closed for values a text input cannot represent", () => {
    const objectSchema = v.object({ settings: v.object({ enabled: v.boolean() }) });
    function Fixture() {
      const form = createForm({ schema: objectSchema, initialInput: { settings: { enabled: true } } });
      return <FormischField of={form} path={["settings"]}>{field => (
        <Input {...formischInputProps(field)} label="Settings" />
      )}</FormischField>;
    }
    expect(() => renderToString(() => <Fixture />)).toThrow("string and finite-number");
  });
});
