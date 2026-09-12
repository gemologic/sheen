// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { MenubarMenu, MenubarRoot, MenubarTrigger } from './7I44E2QD.js';
import { SeparatorRoot } from './STGRFJHZ.js';
import { MenuCheckboxItem, MenuContent, MenuGroup, MenuGroupLabel, MenuIcon, MenuItem, MenuItemDescription, MenuItemIndicator, MenuItemLabel, MenuPortal, MenuRadioGroup, MenuRadioItem, MenuSub, MenuSubContent, MenuSubTrigger, useMenubarContext } from './HGKTPMYY.js';
import { PopperArrow } from './BK63AFY4.js';
import { __export } from './5ZKAE4VZ.js';

// src/menubar/index.tsx
var menubar_exports = {};
__export(menubar_exports, {
  Arrow: () => PopperArrow,
  CheckboxItem: () => MenuCheckboxItem,
  Content: () => MenuContent,
  Group: () => MenuGroup,
  GroupLabel: () => MenuGroupLabel,
  Icon: () => MenuIcon,
  Item: () => MenuItem,
  ItemDescription: () => MenuItemDescription,
  ItemIndicator: () => MenuItemIndicator,
  ItemLabel: () => MenuItemLabel,
  Menu: () => MenubarMenu,
  Menubar: () => Menubar,
  Portal: () => MenuPortal,
  RadioGroup: () => MenuRadioGroup,
  RadioItem: () => MenuRadioItem,
  Root: () => MenubarRoot,
  Separator: () => SeparatorRoot,
  Sub: () => MenuSub,
  SubContent: () => MenuSubContent,
  SubTrigger: () => MenuSubTrigger,
  Trigger: () => MenubarTrigger,
  useMenubarContext: () => useMenubarContext
});
var Menubar = Object.assign(MenubarRoot, {
  Arrow: PopperArrow,
  CheckboxItem: MenuCheckboxItem,
  Content: MenuContent,
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
  Menu: MenubarMenu,
  Separator: SeparatorRoot,
  Sub: MenuSub,
  SubContent: MenuSubContent,
  SubTrigger: MenuSubTrigger,
  Trigger: MenubarTrigger
});

export { Menubar, menubar_exports };
