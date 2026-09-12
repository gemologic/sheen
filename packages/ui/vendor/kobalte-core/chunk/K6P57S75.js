// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { useFormControlContext } from './YKGT7A57.js';
import { mergeDefaultProps, access } from "#sheen-kobalte-utils";
import { createRenderEffect, onCleanup } from 'solid-js';

var FORM_CONTROL_FIELD_PROP_NAMES = ["id", "aria-label", "aria-labelledby", "aria-describedby"];
function createFormControlField(props) {
  const context = useFormControlContext();
  const mergedProps = mergeDefaultProps({
    id: context.generateId("field")
  }, props);
  createRenderEffect(() => onCleanup(context.registerField(access(mergedProps.id))));
  return {
    fieldProps: {
      id: () => access(mergedProps.id),
      ariaLabel: () => access(mergedProps["aria-label"]),
      ariaLabelledBy: () => context.getAriaLabelledBy(access(mergedProps.id), access(mergedProps["aria-label"]), access(mergedProps["aria-labelledby"])),
      ariaDescribedBy: () => context.getAriaDescribedBy(access(mergedProps["aria-describedby"]))
    }
  };
}

export { FORM_CONTROL_FIELD_PROP_NAMES, createFormControlField };
