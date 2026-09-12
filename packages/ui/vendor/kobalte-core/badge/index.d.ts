// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import * as solid_js from 'solid-js';
import { ValidComponent } from 'solid-js';
import { PolymorphicProps } from '../polymorphic/index.js';
import "#sheen-kobalte-utils";

interface BadgeRootOptions {
    /**
     * Accessible text description of the badge if child is not text.
     */
    textValue?: string;
}
interface BadgeRootCommonProps<T extends HTMLElement = HTMLElement> {
    "aria-label"?: string;
}
interface BadgeRootRenderProps extends BadgeRootCommonProps {
}
type BadgeRootProps<T extends ValidComponent | HTMLElement = HTMLElement> = BadgeRootOptions & Partial<BadgeRootCommonProps>;
declare function BadgeRoot<T extends ValidComponent = "span">(props: PolymorphicProps<T, BadgeRootProps<T>>): solid_js.JSX.Element;

declare const Badge: typeof BadgeRoot;

export { Badge, BadgeRootCommonProps, BadgeRootOptions, BadgeRootProps, BadgeRootRenderProps, BadgeRoot as Root };
