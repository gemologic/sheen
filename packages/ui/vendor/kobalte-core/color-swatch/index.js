// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { COLOR_INTL_TRANSLATIONS } from '../chunk/CWAEFUDR.js';
import { Polymorphic } from '../chunk/6Y7B2NEO.js';
import { createComponent, mergeProps } from 'solid-js/web';
import { mergeDefaultProps } from "#sheen-kobalte-utils";
import { combineStyle } from '@solid-primitives/props';
import { createUniqueId, splitProps } from 'solid-js';

// src/color-swatch/color-swatch.intl.ts
var COLOR_SWATCH_INTL_TRANSLATIONS = {
  roleDescription: "Color Swatch",
  transparent: "transparent"
};

// src/color-swatch/color-swatch-root.tsx
function ColorSwatchRoot(props) {
  const defaultId = `colorswatch-${createUniqueId()}`;
  const mergedProps = mergeDefaultProps({
    id: defaultId,
    translations: COLOR_SWATCH_INTL_TRANSLATIONS
  }, props);
  const [local, others] = splitProps(mergedProps, ["style", "value", "colorName", "aria-label", "translations"]);
  const ariaLabel = () => {
    const colorName = local.colorName ?? (local.value.getChannelValue("alpha") === 0 ? local.translations.transparent : local.value.getColorName(COLOR_INTL_TRANSLATIONS));
    return [colorName, local["aria-label"]].filter(Boolean).join(", ");
  };
  return createComponent(Polymorphic, mergeProps({
    as: "div",
    role: "img",
    get ["aria-roledescription"]() {
      return local.translations.roleDescription;
    },
    get ["aria-label"]() {
      return ariaLabel();
    },
    get style() {
      return combineStyle({
        "background-color": local.value.toString("css"),
        "forced-color-adjust": "none"
      }, local.style);
    }
  }, others));
}

// src/color-swatch/index.tsx
var ColorSwatch = ColorSwatchRoot;

export { ColorSwatch, ColorSwatchRoot as Root };
