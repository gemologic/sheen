// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { Accessor } from 'solid-js';

declare function createSize(ref: Accessor<HTMLElement | undefined>): {
    width: Accessor<number>;
    height: Accessor<number>;
};

export { createSize };
