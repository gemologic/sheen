// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import {
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from "./V25KEN4T.jsx";
import {
  __export
} from "./5WXHJDCZ.jsx";

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

// src/alert-dialog/alert-dialog-content.tsx
function AlertDialogContent(props) {
  return <DialogContent
    role="alertdialog"
    {...props}
  />;
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

export {
  AlertDialogContent,
  AlertDialog,
  alert_dialog_exports
};
