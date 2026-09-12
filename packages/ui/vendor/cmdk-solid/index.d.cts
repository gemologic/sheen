// Vendored and modified by Gemologic Sheen from cmdk-solid@1.2.0; see package THIRD_PARTY_NOTICES.md.
import { Dialog as Dialog$1 } from "#sheen-kobalte";
import { Component, JSX, ParentComponent, Accessor } from 'solid-js';

type Children = {
    children?: JSX.Element;
};
type DivProps = JSX.IntrinsicElements['div'];
type CommandLoadingProps = Children & DivProps & {
    /** Estimated progress of loading asynchronous options. */
    progress?: number;
    /**
     * Accessible label for this loading progressbar. Not shown visibly.
     */
    label?: string;
};
type CommandEmptyProps = Children & DivProps & {};
type CommandSeparatorProps = DivProps & {
    /** Whether this separator should always be rendered. Useful if you disable automatic filtering. */
    alwaysRender?: boolean;
};
type CommandDialogProps = Dialog$1.DialogRootProps & CommandRootProps & {
    /** Provide a className to the Dialog overlay. */
    overlayClassName?: string;
    /** Provide a className to the Dialog content. */
    contentClassName?: string;
    /** Provide a custom element the Dialog should portal into. */
    container?: HTMLElement;
};
type CommandListProps = Children & DivProps & {
    /**
     * Accessible label for this List of suggestions. Not shown visibly.
     */
    label?: string;
};
type CommandItemProps = Children & Omit<DivProps, 'disabled' | 'onSelect' | 'value'> & {
    /** Whether this item is currently disabled. */
    disabled?: boolean;
    /** Event handler for when this item is selected, either via click or keyboard selection. */
    onSelect?: (value: string) => void;
    /**
     * A unique value for this item.
     * If no value is provided, it will be inferred from `children` or the rendered `textContent`. If your `textContent` changes between renders, you _must_ provide a stable, unique `value`.
     */
    value?: string;
    /** Optional keywords to match against when filtering. */
    keywords?: string[];
    /** Whether this item is forcibly rendered regardless of filtering. */
    forceMount?: boolean;
};
type CommandGroupProps = Children & Omit<DivProps, 'heading' | 'value'> & {
    /** Optional heading to render for this group. */
    heading?: JSX.Element;
    /** If no heading is provided, you must provide a value that is unique for this group. */
    value?: string;
    /** Whether this group is forcibly rendered regardless of filtering. */
    forceMount?: boolean;
};
type CommandInputProps = Omit<JSX.IntrinsicElements['input'], 'value' | 'onChange' | 'type'> & {
    /**
     * Optional controlled state for the value of the search input.
     */
    value?: string;
    /**
     * Event handler called when the search value changes.
     */
    onValueChange?: (search: string) => void;
};
type CommandRootProps = Children & DivProps & {
    /**
     * Accessible label for this command menu. Not shown visibly.
     */
    label?: string;
    /**
     * Optionally set to `false` to turn off the automatic filtering and sorting.
     * If `false`, you must conditionally render valid items based on the search query yourself.
     */
    shouldFilter?: boolean;
    /**
     * Custom filter function for whether each command menu item should matches the given search query.
     * It should return a number between 0 and 1, with 1 being the best match and 0 being hidden entirely.
     * By default, uses the `command-score` library.
     */
    filter?: (value: string, search: string, keywords?: string[]) => number;
    /**
     * Optional default item value when it is initially rendered.
     */
    defaultValue?: string;
    /**
     * Optional controlled state of the selected command menu item.
     */
    value?: string;
    /**
     * Event handler called when the selected item of the menu changes.
     */
    onValueChange?: (value: string) => void;
    /**
     * Optionally set to `true` to turn on looping around when using the arrow keys.
     */
    loop?: boolean;
    /**
     * Optionally set to `true` to disable selection via pointer events.
     */
    disablePointerSelection?: boolean;
    /**
     * Set to `false` to disable ctrl+n/j/p/k shortcuts. Defaults to `true`.
     */
    vimBindings?: boolean;
};
type ItemValue = {
    value: Accessor<string>;
    keywords?: Accessor<string[] | undefined>;
};
type State = {
    search: string;
    value: string;
    filtered: {
        count: number;
        items: Record<string, number>;
        groups: string[];
    };
    items: string[];
    groups: Record<string, string[]>;
    ids: Record<string, ItemValue>;
};
declare const defaultFilter: NonNullable<CommandRootProps['filter']>;
declare const Command: Component<CommandRootProps>;
/**
 * Command menu item. Becomes active on pointer enter or through keyboard navigation.
 * Preferably pass a `value`, otherwise the value will be inferred from `children` or
 * the rendered item's `textContent`.
 */
declare const Item: ParentComponent<CommandItemProps>;
type Group = {
    id: string;
    forceMount?: boolean;
};
/**
 * Group command menu items together with a heading.
 * Grouped items are always shown together.
 */
declare const Group: ParentComponent<CommandGroupProps>;
/**
 * A visual and semantic separator between items or groups.
 * Visible when the search query is empty or `alwaysRender` is true, hidden otherwise.
 */
declare const Separator: Component<CommandSeparatorProps>;
/**
 * Command menu input.
 * All props are forwarded to the underyling `input` element.
 */
declare const Input: Component<CommandInputProps>;
/**
 * Contains `Item`, `Group`, and `Separator`.
 * Use the `--cmdk-list-height` CSS variable to animate height based on the number of results.
 */
declare const List: ParentComponent<CommandListProps>;
/**
 * Renders the command menu in a Kobalte Dialog.
 */
declare const Dialog: ParentComponent<CommandDialogProps>;
/**
 * Automatically renders when there are no results for the search query.
 */
declare const Empty: ParentComponent<CommandEmptyProps>;
/**
 * You should conditionally render this with `progress` while loading asynchronous items.
 */
declare const Loading: ParentComponent<CommandLoadingProps>;
declare const pkg: Component<CommandRootProps> & {
    List: ParentComponent<CommandListProps>;
    Item: ParentComponent<CommandItemProps>;
    Input: Component<CommandInputProps>;
    Group: ParentComponent<CommandGroupProps>;
    Separator: Component<CommandSeparatorProps>;
    Dialog: ParentComponent<CommandDialogProps>;
    Empty: ParentComponent<CommandEmptyProps>;
    Loading: ParentComponent<CommandLoadingProps>;
};

/** Run a selector against the store state. */
declare function useCmdk<T = any>(selector: (state: State) => T): () => T;

export { pkg as Command, Dialog as CommandDialog, type CommandDialogProps, Empty as CommandEmpty, type CommandEmptyProps, Group as CommandGroup, type CommandGroupProps, Input as CommandInput, type CommandInputProps, Item as CommandItem, type CommandItemProps, List as CommandList, type CommandListProps, Loading as CommandLoading, type CommandLoadingProps, Command as CommandRoot, type CommandRootProps, Separator as CommandSeparator, type CommandSeparatorProps, defaultFilter, useCmdk as useCommandState };
