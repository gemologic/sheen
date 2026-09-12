// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import {
  SeparatorRoot
} from "./T4C3DMHT.jsx";
import {
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuIcon,
  MenuItem,
  MenuItemDescription,
  MenuItemIndicator,
  MenuItemLabel,
  MenuPortal,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  useMenuContext,
  useMenuRootContext
} from "./3ARTUDH2.jsx";
import {
  PopperArrow
} from "./OGE3DKII.jsx";
import {
  __export
} from "./5WXHJDCZ.jsx";

// src/dropdown-menu/index.tsx
var dropdown_menu_exports = {};
__export(dropdown_menu_exports, {
  Arrow: () => PopperArrow,
  CheckboxItem: () => MenuCheckboxItem,
  Content: () => DropdownMenuContent,
  DropdownMenu: () => DropdownMenu,
  Group: () => MenuGroup,
  GroupLabel: () => MenuGroupLabel,
  Icon: () => MenuIcon,
  Item: () => MenuItem,
  ItemDescription: () => MenuItemDescription,
  ItemIndicator: () => MenuItemIndicator,
  ItemLabel: () => MenuItemLabel,
  Portal: () => MenuPortal,
  RadioGroup: () => MenuRadioGroup,
  RadioItem: () => MenuRadioItem,
  Root: () => DropdownMenuRoot,
  Separator: () => SeparatorRoot,
  Sub: () => MenuSub,
  SubContent: () => MenuSubContent,
  SubTrigger: () => MenuSubTrigger,
  Trigger: () => MenuTrigger
});

// src/dropdown-menu/dropdown-menu-content.tsx
import { focusWithoutScrolling } from "#sheen-kobalte-utils";
import { splitProps } from "solid-js";
function DropdownMenuContent(props) {
  const rootContext = useMenuRootContext();
  const context = useMenuContext();
  const [local, others] = splitProps(props, [
    "onCloseAutoFocus",
    "onInteractOutside"
  ]);
  let hasInteractedOutside = false;
  const onCloseAutoFocus = (e) => {
    local.onCloseAutoFocus?.(e);
    if (e.defaultPrevented) return;
    if (!hasInteractedOutside) {
      focusWithoutScrolling(context.triggerRef());
    }
    hasInteractedOutside = false;
    e.preventDefault();
  };
  const onInteractOutside = (e) => {
    local.onInteractOutside?.(e);
    if (!rootContext.isModal() || e.detail.isContextMenu) {
      hasInteractedOutside = true;
    }
  };
  return <MenuContent
    onCloseAutoFocus={onCloseAutoFocus}
    onInteractOutside={onInteractOutside}
    {...others}
  />;
}

// src/dropdown-menu/dropdown-menu-root.tsx
import { mergeDefaultProps } from "#sheen-kobalte-utils";
import { createUniqueId } from "solid-js";
function DropdownMenuRoot(props) {
  const defaultId = `dropdownmenu-${createUniqueId()}`;
  const mergedProps = mergeDefaultProps({ id: defaultId }, props);
  return <MenuRoot {...mergedProps} />;
}

// src/dropdown-menu/index.tsx
var DropdownMenu = Object.assign(DropdownMenuRoot, {
  Arrow: PopperArrow,
  CheckboxItem: MenuCheckboxItem,
  Content: DropdownMenuContent,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  Icon: MenuIcon,
  Item: MenuItem,
  ItemDescription: MenuItemDescription,
  ItemIndicator: MenuItemIndicator,
  ItemLabel: MenuItemLabel,
  Portal: MenuPortal,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Separator: SeparatorRoot,
  Sub: MenuSub,
  SubContent: MenuSubContent,
  SubTrigger: MenuSubTrigger,
  Trigger: MenuTrigger
});

export {
  DropdownMenuContent,
  DropdownMenuRoot,
  DropdownMenu,
  dropdown_menu_exports
};
