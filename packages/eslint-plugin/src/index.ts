import type { ESLint, Linter, Rule } from "eslint";
import packageMetadata from "../package.json" with { type: "json" };
import { noArbitrarySpacing } from "./rules/no-arbitrary-spacing.js";
import { noComputedStyle } from "./rules/no-computed-style.js";
import { noDirectPrimitiveImport } from "./rules/no-direct-primitive-import.js";
import { noDocumentScroll } from "./rules/no-document-scroll.js";
import { noDynamicIconName } from "./rules/no-dynamic-icon-name.js";
import { noHardcodedRadius } from "./rules/no-hardcoded-radius.js";
import { noMountAnimation } from "./rules/no-mount-animation.js";
import { noNativeControl } from "./rules/no-native-control.js";
import { noPhysicalProperties } from "./rules/no-physical-properties.js";
import { noPropsDestructure } from "./rules/no-props-destructure.js";
import { noRawColor } from "./rules/no-raw-color.js";
import { noTier1InComponent } from "./rules/no-tier1-in-component.js";
import { noUnknownIcon } from "./rules/no-unknown-icon.js";
import { noUnsafeSeam } from "./rules/no-unsafe-seam.js";
import { preferLayoutPrimitive } from "./rules/prefer-layout-primitive.js";
import { requireIconLabel } from "./rules/icon-markup.js";
import { requireClassMerge } from "./rules/require-class-merge.js";

export const rules: Readonly<Record<string, Rule.RuleModule>> = {
  "no-arbitrary-spacing": noArbitrarySpacing,
  "no-computed-style": noComputedStyle,
  "no-direct-primitive-import": noDirectPrimitiveImport,
  "no-document-scroll": noDocumentScroll,
  "no-dynamic-icon-name": noDynamicIconName,
  "no-hardcoded-radius": noHardcodedRadius,
  "no-mount-animation": noMountAnimation,
  "no-native-control": noNativeControl,
  "no-physical-properties": noPhysicalProperties,
  "no-props-destructure": noPropsDestructure,
  "no-raw-color": noRawColor,
  "no-tier1-in-component": noTier1InComponent,
  "no-unknown-icon": noUnknownIcon,
  "no-unsafe-seam": noUnsafeSeam,
  "prefer-layout-primitive": preferLayoutPrimitive,
  "require-class-merge": requireClassMerge,
  "require-icon-label": requireIconLabel,
};

const plugin: ESLint.Plugin = { meta: { name: packageMetadata.name, version: packageMetadata.version }, rules };

export const recommended: Linter.Config = {
  plugins: { sheen: plugin },
  rules: {
    "sheen/no-arbitrary-spacing": "error",
    "sheen/no-computed-style": "error",
    "sheen/no-direct-primitive-import": "error",
    "sheen/no-document-scroll": "error",
    "sheen/no-dynamic-icon-name": "warn",
    "sheen/no-hardcoded-radius": "error",
    "sheen/no-mount-animation": "error",
    "sheen/no-native-control": "error",
    "sheen/no-physical-properties": "error",
    "sheen/no-props-destructure": "error",
    "sheen/no-raw-color": "error",
    "sheen/no-tier1-in-component": "error",
    "sheen/no-unknown-icon": "error",
    "sheen/no-unsafe-seam": "warn",
    "sheen/prefer-layout-primitive": "warn",
    "sheen/require-class-merge": "error",
    "sheen/require-icon-label": "error",
  },
};

const sheenPlugin: ESLint.Plugin = { ...plugin, configs: { recommended } };

export default sheenPlugin;
