export { Icon, DynamicIcon } from "./runtime.tsx";
export type { IconData, IconProps, DynamicIconProps, StaticIconProps } from "./runtime.tsx";
export { LazyIcon, isLazyIconName, preloadIcons } from "./lazy.tsx";
export type { LazyIconProps } from "./lazy.tsx";
export { isLucideIconAlias, lucideIconAliases, resolveLucideIconName } from "./lucide.ts";
export type { LucideIconAlias } from "./lucide.ts";
export { fallbackIconSet, iconNames, iconRegistry, isIconName } from "./registry.ts";
export type { IconName, IconSetName, IconSources } from "./registry.ts";
export * from "./generated/icons.ts";
