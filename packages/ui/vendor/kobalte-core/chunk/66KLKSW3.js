// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { DialogCloseButton, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogTrigger, DialogContent } from './27MLNS66.js';
import { __export } from './5ZKAE4VZ.js';
import { createComponent, mergeProps } from 'solid-js/web';

// src/alert-dialog/index.tsx
var alert_dialog_exports = {};
__export(alert_dialog_exports, {
  AlertDialog: () => AlertDialog,
  CloseButton: () => DialogCloseButton,
  Content: () => AlertDialogContent,
  Description: () => DialogDescription,
  Overlay: () => DialogOverlay,
  Portal: () => DialogPortal,
  Root: () => DialogRoot,
  Title: () => DialogTitle,
  Trigger: () => DialogTrigger
});
function AlertDialogContent(props) {
  return createComponent(DialogContent, mergeProps({
    role: "alertdialog"
  }, props));
}

// src/alert-dialog/index.tsx
var AlertDialog = Object.assign(DialogRoot, {
  CloseButton: DialogCloseButton,
  Content: AlertDialogContent,
  Description: DialogDescription,
  Overlay: DialogOverlay,
  Portal: DialogPortal,
  Title: DialogTitle,
  Trigger: DialogTrigger
});

export { AlertDialog, AlertDialogContent, alert_dialog_exports };
