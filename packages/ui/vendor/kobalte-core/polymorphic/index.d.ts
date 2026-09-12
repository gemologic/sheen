// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { OverrideProps } from "#sheen-kobalte-utils";
export { OverrideComponentProps, OverrideProps } from "#sheen-kobalte-utils";
import { ValidComponent, JSX, ComponentProps } from 'solid-js';

type ElementOf<T> = T extends HTMLElement ? T : T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : any;
/**
 * Polymorphic attribute.
 */
interface PolymorphicAttributes<T extends ValidComponent> {
    as?: T | keyof JSX.HTMLElementTags;
}
/**
 * Props used by a polymorphic component.
 */
type PolymorphicProps<T extends ValidComponent, Props extends {} = {}> = OverrideProps<ComponentProps<T>, // Override props from custom/tag component with our own
// Override props from custom/tag component with our own
Props & // Accept custom props of our own component
PolymorphicAttributes<T>>;
/**
 * Helper type to get the exact props in Polymnorphic `as` callback.
 */
type PolymorphicCallbackProps<CustomProps extends {}, Options extends {}, RenderProps extends {}> = Omit<CustomProps, keyof Options | keyof RenderProps> & RenderProps;
/**
 * A utility component that render its `as` prop.
 */
declare function Polymorphic<RenderProps>(props: RenderProps & PolymorphicAttributes<ValidComponent>): JSX.Element;

export { ElementOf, Polymorphic, PolymorphicAttributes, PolymorphicCallbackProps, PolymorphicProps };
