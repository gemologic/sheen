// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { MaybeAccessor } from "#sheen-kobalte-utils";
import { Accessor } from 'solid-js';

interface CreateEscapeKeyDownProps {
    /** Whether the escape key down events should be listened or not. */
    isDisabled?: MaybeAccessor<boolean | undefined>;
    /** The owner document to attach listeners to. */
    ownerDocument?: Accessor<Document>;
    /** Event handler called when the escape key is down. */
    onEscapeKeyDown?: (event: KeyboardEvent) => void;
}
/**
 * Listens for when the escape key is down on the document.
 */
declare function createEscapeKeyDown(props: CreateEscapeKeyDownProps): void;

export { CreateEscapeKeyDownProps, createEscapeKeyDown };
