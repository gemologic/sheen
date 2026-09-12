// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { Accessor } from 'solid-js';

/**
 * Listens for `reset` event on the closest `<form>` element and execute the given handler.
 */
declare function createFormResetListener(element: Accessor<HTMLElement | null | undefined>, handler: () => void): void;

export { createFormResetListener };
