// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import {
  Polymorphic
} from "./FLVHQV4A.jsx";
import {
  __export
} from "./5WXHJDCZ.jsx";

// src/alert/index.tsx
var alert_exports = {};
__export(alert_exports, {
  Alert: () => Alert,
  Root: () => AlertRoot
});

// src/alert/alert-root.tsx
function AlertRoot(props) {
  return <Polymorphic
    as="div"
    role="alert"
    {...props}
  />;
}

// src/alert/index.tsx
var Alert = AlertRoot;

export {
  AlertRoot,
  Alert,
  alert_exports
};
