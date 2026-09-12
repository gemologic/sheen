// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
// src/primitives/create-escape-key-down/create-escape-key-down.ts
import {
  EventKey,
  access,
  getDocument
} from "#sheen-kobalte-utils";
import { createEffect, onCleanup } from "solid-js";
import { isServer } from "solid-js/web";
function createEscapeKeyDown(props) {
  const handleKeyDown = (event) => {
    if (event.key === EventKey.Escape) {
      props.onEscapeKeyDown?.(event);
    }
  };
  createEffect(() => {
    if (isServer) {
      return;
    }
    if (access(props.isDisabled)) {
      return;
    }
    const document = props.ownerDocument?.() ?? getDocument();
    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });
}

export {
  createEscapeKeyDown
};
