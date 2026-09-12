// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { MaybeAccessor } from "#sheen-kobalte-utils";
import { Accessor } from 'solid-js';

interface CreateFocusScopeProps {
    /** Whether focus cannot escape the focus scope via keyboard, pointer, or a programmatic focus. */
    trapFocus?: MaybeAccessor<boolean | undefined>;
    /**
     * Event handler called when autofocusing on mount.
     * Can be prevented.
     */
    onMountAutoFocus?: (event: Event) => void;
    /**
     * Event handler called when autofocusing on unmount.
     * Can be prevented.
     */
    onUnmountAutoFocus?: (event: Event) => void;
}
declare function createFocusScope<T extends HTMLElement>(props: CreateFocusScopeProps, ref: Accessor<T | undefined>): void;

export { CreateFocusScopeProps, createFocusScope };
