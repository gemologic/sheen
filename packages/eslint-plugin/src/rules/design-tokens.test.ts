import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";
import { noArbitrarySpacing } from "./no-arbitrary-spacing.js";
import { noHardcodedRadius } from "./no-hardcoded-radius.js";
import { noPhysicalProperties } from "./no-physical-properties.js";
import { noRawColor } from "./no-raw-color.js";
import { noTier1InComponent } from "./no-tier1-in-component.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-raw-color", noRawColor, {
  valid: [
    { filename: "/app/src/Card.tsx", code: 'const color = "var(--sheen-color-bg)";' },
    { filename: "/app/src/themes/private.ts", code: 'const color = "#123456";' },
    { filename: "/repo/packages/tokens/src/theme.ts", code: 'const color = "oklch(0.5 0.1 30)";' },
  ],
  invalid: [
    { filename: "/app/src/Card.tsx", code: 'const color = "#123456";', errors: [{ messageId: "forbidden" }] },
    { filename: "/app/src/Card.tsx", code: 'const classes = `bg-blue-500 p-2`;', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-arbitrary-spacing", noArbitrarySpacing, {
  valid: [
    'const classes = "gap-[var(--sheen-space-gutter)]";',
    'const classes = "gap-sheen-gutter ps-sheen-md";',
  ],
  invalid: [
    { code: 'const classes = "p-[13px]";', errors: [{ messageId: "forbidden" }] },
    { code: 'const classes = `grid gap-[7px]`;', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-hardcoded-radius", noHardcodedRadius, {
  valid: [
    'const classes = "rounded-control";',
    'const css = "border-radius: var(--sheen-surface-radius);";',
    'const style = { borderRadius: "var(--sheen-control-radius)" };',
  ],
  invalid: [
    { code: 'const classes = "rounded-lg";', errors: [{ messageId: "forbidden" }] },
    { code: 'const css = "border-radius: 9px;";', errors: [{ messageId: "forbidden" }] },
    { code: 'const style = { borderRadius: "9px" };', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-tier1-in-component", noTier1InComponent, {
  valid: [
    { filename: "/app/src/Card.tsx", code: 'const color = "var(--sheen-color-fg-muted)";' },
    { filename: "/app/src/themes/private.ts", code: 'const color = "var(--sheen-gray-500)";' },
  ],
  invalid: [
    { filename: "/app/src/Card.tsx", code: 'const color = "var(--sheen-gray-500)";', errors: [{ messageId: "forbidden" }] },
    { filename: "/app/src/Card.tsx", code: 'const size = "var(--sheen-size-4)";', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-physical-properties", noPhysicalProperties, {
  valid: [
    'const classes = "ms-2 ps-2 text-start";',
    'const css = "padding-inline-start: var(--sheen-space-inline-sm); inset-inline-end: 0";',
    'const style = { marginInlineStart: "var(--sheen-space-inline-sm)", textAlign: "start" };',
  ],
  invalid: [
    { code: 'const classes = "ml-2 text-left";', errors: [{ messageId: "forbidden" }] },
    { code: 'const css = "padding-right: 4px";', errors: [{ messageId: "forbidden" }] },
    { code: 'const style = { marginLeft: "var(--sheen-space-inline-sm)" };', errors: [{ messageId: "forbidden" }] },
    { code: 'const style = { textAlign: "right" };', errors: [{ messageId: "forbidden" }] },
  ],
});
