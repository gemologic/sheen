// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { Setter } from 'solid-js';

/**
 * Create a function that call the setter with an id and return a function to reset it.
 */
declare function createRegisterId(setter: Setter<string | undefined>): (id: string) => () => undefined;

export { createRegisterId };
