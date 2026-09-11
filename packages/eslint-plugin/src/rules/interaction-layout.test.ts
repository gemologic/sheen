import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";
import { iconNames } from "../../../icons/src/registry.ts";
import { semanticIconNames } from "../semantic-icon-names.js";
import { requireIconLabel } from "./icon-markup.js";
import { noDocumentScroll } from "./no-document-scroll.js";
import { noDynamicIconName } from "./no-dynamic-icon-name.js";
import { noMountAnimation } from "./no-mount-animation.js";
import { noUnknownIcon } from "./no-unknown-icon.js";
import { noUnsafeSeam } from "./no-unsafe-seam.js";
import { preferLayoutPrimitive } from "./prefer-layout-primitive.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("semantic icon lint registry", () => {
  it("stays identical to the runtime registry", () => {
    expect(semanticIconNames).toEqual(iconNames);
  });
});

tester.run("no-document-scroll", noDocumentScroll, {
  valid: ['const view = <ScrollArea class="min-h-0" />;', 'const mobile = "md:overflow-hidden";'],
  invalid: [
    { code: 'const view = <main class="min-h-screen">content</main>;', errors: [{ messageId: "forbidden" }] },
    { code: 'const view = <div class={`pane overflow-y-auto`}>content</div>;', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-mount-animation", noMountAnimation, {
  valid: [
    { filename: "/app/src/Chart.tsx", code: 'const spinner = <span class="animate-spin" />;' },
    { filename: "/repo/packages/ui/src/primitives/Toast.tsx", code: 'const toast = <div class="animate-in fade-in" />;' },
  ],
  invalid: [
    { filename: "/app/src/Dashboard.tsx", code: 'const view = <main class="animate-in">content</main>;', errors: [{ messageId: "forbidden" }] },
    { filename: "/app/src/Route.tsx", code: 'const view = <section class="slide-in-from-bottom">content</section>;', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("require-icon-label", requireIconLabel, {
  valid: [
    'const icon = <Icon name="settings" />;',
    'const icon = <Icon name="settings" decorative={false} label="Settings" />;',
    'const action = <IconButton label="Search"><SearchIcon /></IconButton>;',
    'const action = <Tooltip content="Search"><Button><SearchIcon /></Button></Tooltip>;',
  ],
  invalid: [
    { code: 'const icon = <Icon name="settings" decorative={false} />;', errors: [{ messageId: "icon" }] },
    { code: 'const icon = <SettingsIcon decorative={false} label="" />;', errors: [{ messageId: "icon" }] },
    { code: 'const action = <IconButton><SearchIcon /></IconButton>;', errors: [{ messageId: "button" }] },
    { code: 'const action = <Button><SearchIcon /></Button>;', errors: [{ messageId: "button" }] },
  ],
});

tester.run("no-unknown-icon", noUnknownIcon, {
  valid: ['const icon = <Icon name="settings" />;', 'const icon = <DynamicIcon name={name} />;'],
  invalid: [{ code: 'const icon = <Icon name="preferences" />;', errors: [{ messageId: "unknown", data: { name: "preferences" } }] }],
});

tester.run("no-dynamic-icon-name", noDynamicIconName, {
  valid: ['const icon = <Icon name="settings" />;', 'const icon = <DynamicIcon name={name} />;'],
  invalid: [{ code: 'const icon = <Icon name={name} />;', errors: [{ messageId: "dynamic" }] }],
});

tester.run("no-unsafe-seam", noUnsafeSeam, {
  valid: ["const column = { width: 120 };"],
  invalid: [
    { code: "const column = { __unsafe_tanstack: { enableHiding: false } };", errors: [{ messageId: "unsafe" }] },
    { code: "const options = chart.__unsafe_uplot;", errors: [{ messageId: "unsafe" }] },
  ],
});

tester.run("prefer-layout-primitive", preferLayoutPrimitive, {
  valid: [
    'const view = <Stack gap="md" />;',
    { filename: "/repo/packages/ui/src/layout/Layout.tsx", code: 'const view = <div class="flex flex-col gap-4" />;' },
  ],
  invalid: [
    { code: 'const view = <div class="flex flex-col gap-4" />;', errors: [{ messageId: "preferred", data: { name: "Stack" } }] },
    { code: 'const view = <div class="grid gap-2" />;', errors: [{ messageId: "preferred", data: { name: "Grid" } }] },
    { code: 'const view = <div class={`flex gap-md`} />;', errors: [{ messageId: "preferred", data: { name: "Row" } }] },
  ],
});
