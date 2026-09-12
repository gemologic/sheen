// Vendored and modified by Gemologic Sheen from cmdk-solid@1.2.0; see package THIRD_PARTY_NOTICES.md.
import {
  commandScore
} from "./chunk/5WIGIOAJ.jsx";

// src/index.tsx
import { Dialog as KobalteDialog } from "#sheen-kobalte";
import {
  Show,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  on,
  onCleanup,
  onMount,
  splitProps,
  untrack,
  useContext
} from "solid-js";
import { createStore, produce } from "solid-js/store";
var GROUP_SELECTOR = `[cmdk-group=""]`;
var GROUP_HEADING_SELECTOR = `[cmdk-group-heading=""]`;
var ITEM_SELECTOR = `[cmdk-item=""]`;
var VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`;
var SELECT_EVENT = `cmdk-item-select`;
var VALUE_ATTR = `data-value`;
var DIALOG_ROOT_KEYS = [
  "open",
  "defaultOpen",
  "onOpenChange",
  "id",
  "modal",
  "preventScroll",
  "forceMount",
  "translations"
];
var defaultFilter = (value, search, keywords) => commandScore(value, search, keywords);
var CommandContext = createContext();
var useCommand = () => useContext(CommandContext);
var StoreContext = createContext();
var useStore = () => useContext(StoreContext);
var GroupContext = createContext(() => void 0);
var Command = (props) => {
  const [uncontrolledValue, setUncontrolledValue] = createSignal(props.value?.trim() ?? props.defaultValue ?? "");
  const [state, setState] = createStore({
    search: "",
    get value() {
      return props.value !== void 0 ? props.value.trim() : uncontrolledValue();
    },
    get filtered() {
      return filtered();
    },
    items: [],
    groups: {},
    ids: {}
  });
  const mergedProps = mergeProps({ vimBindings: true, disablePointerSelection: false }, props);
  const filtered = createMemo(() => {
    const skipFiltering = !state.search || mergedProps.shouldFilter === false;
    const items = state.items.reduce(
      (acc, id) => {
        const registered = state.ids[id];
        acc[id] = skipFiltering ? 1 : registered ? score(registered.value(), registered.keywords?.()) : 0;
        return acc;
      },
      {}
    );
    const groups = Object.keys(state.groups).filter((groupId) => {
      return state.groups[groupId].some((id) => (items[id] || 0) > 0);
    });
    const count = Object.values(items).filter((score2) => score2 > 0).length;
    return { count, items, groups };
  });
  const [, etc] = splitProps(mergedProps, [
    "label",
    "children",
    "value",
    "onValueChange",
    "filter",
    "shouldFilter",
    "loop",
    "disablePointerSelection",
    "vimBindings"
  ]);
  const listId = createUniqueId();
  const labelId = createUniqueId();
  const inputId = createUniqueId();
  const [listInnerRef, setListInnerRef] = createSignal(null);
  const schedule = useSchedule();
  onMount(() => {
    schedule(6, scrollSelectedIntoView);
  });
  const store = {
    state,
    setState: (key, value, opts) => {
      if (untrack(() => Object.is(state[key], value))) return;
      if (key === "value") {
        setUncontrolledValue(value);
      } else {
        setState(key, value);
      }
      if (key === "search") {
        schedule(8, selectFirstItem);
      } else if (key === "value") {
        if (!opts) {
          schedule(5, scrollSelectedIntoView);
        }
        if (mergedProps.value !== void 0) {
          const newValue = value ?? "";
          mergedProps.onValueChange?.(newValue);
          return;
        }
      }
    }
  };
  const context = {
    value: (id, value, keywords) => {
      setState(
        produce((draft) => {
          draft.ids[id] = { value, keywords };
        })
      );
      return () => {
        setState(
          produce((draft) => {
            delete draft.ids[id];
          })
        );
      };
    },
    // Track item lifecycle (mount, unmount)
    item: (id, groupId) => {
      if (!listInnerRef()) {
        console.warn("Mount Command.Item inside a Command.List component.");
      }
      setState(
        produce((draft) => {
          if (!draft.items.includes(id)) draft.items.push(id);
          if (groupId) {
            const group = draft.groups[groupId] ??= [];
            if (!group.includes(id)) group.push(id);
          }
        })
      );
      schedule(3, () => {
        if (!state.value) {
          selectFirstItem();
        }
      });
      return () => {
        setState(
          produce((draft) => {
            const index = draft.items.indexOf(id);
            if (index !== -1) draft.items.splice(index, 1);
            if (groupId) {
              const group = draft.groups[groupId];
              const groupIndex = group?.indexOf(id) ?? -1;
              if (group && groupIndex !== -1) group.splice(groupIndex, 1);
            }
          })
        );
        const selectedItem = getSelectedItem();
        if (selectedItem?.getAttribute("id") === id) schedule(1, () => selectFirstItem());
      };
    },
    // Track group lifecycle (mount, unmount)
    group: (id) => {
      if (!listInnerRef()) {
        console.warn("Mount Command.Group inside a Command.List component.");
      }
      setState(
        produce((draft) => {
          draft.groups[id] ??= [];
        })
      );
      return () => {
        setState(
          produce((draft) => {
            delete draft.groups[id];
          })
        );
      };
    },
    filter: () => {
      return mergedProps.shouldFilter !== false;
    },
    label: () => mergedProps.label || props["aria-label"] || "",
    disablePointerSelection: () => !!mergedProps.disablePointerSelection,
    listId,
    inputId,
    labelId,
    listInnerRef,
    setListInnerRef
  };
  function score(value, keywords) {
    const filter = mergedProps.filter ?? defaultFilter;
    return value ? filter(value, state.search, keywords) : 0;
  }
  function selectFirstItem() {
    const item = getValidItems().find((item2) => item2.getAttribute("aria-disabled") !== "true");
    const value = item?.getAttribute(VALUE_ATTR) || "";
    store.setState("value", value);
  }
  function scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      const item = getSelectedItem();
      if (item) {
        if (item.parentElement?.firstChild === item) {
          item.closest(GROUP_SELECTOR)?.querySelector(GROUP_HEADING_SELECTOR)?.scrollIntoView({ block: "nearest" });
        }
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }
  function getSelectedItem() {
    return listInnerRef()?.querySelector(`${ITEM_SELECTOR}[aria-selected="true"]`);
  }
  function getValidItems() {
    return Array.from(listInnerRef()?.querySelectorAll(VALID_ITEM_SELECTOR) || []);
  }
  function updateSelectedToIndex(index) {
    const items = getValidItems();
    const item = items[index];
    if (item) store.setState("value", item.getAttribute(VALUE_ATTR) || "");
  }
  function updateSelectedByItem(change) {
    const selected = getSelectedItem();
    const items = getValidItems();
    const index = items.findIndex((item) => item === selected);
    let newSelected = items[index + change];
    if (mergedProps.loop) {
      newSelected = index + change < 0 ? items[items.length - 1] : index + change === items.length ? items[0] : items[index + change];
    }
    if (newSelected) store.setState("value", newSelected.getAttribute(VALUE_ATTR) || "");
  }
  function updateSelectedByGroup(change) {
    const selected = getSelectedItem();
    let group = selected?.closest(GROUP_SELECTOR);
    let item = null;
    while (group && !item) {
      group = change > 0 ? findNextSibling(group, GROUP_SELECTOR) : findPreviousSibling(group, GROUP_SELECTOR);
      item = group?.querySelector(VALID_ITEM_SELECTOR) || null;
    }
    if (item) {
      store.setState("value", item.getAttribute(VALUE_ATTR) || "");
    } else {
      updateSelectedByItem(change);
    }
  }
  const last = () => updateSelectedToIndex(getValidItems().length - 1);
  const next = (e) => {
    e.preventDefault();
    if (e.metaKey) {
      last();
    } else if (e.altKey) {
      updateSelectedByGroup(1);
    } else {
      updateSelectedByItem(1);
    }
  };
  const prev = (e) => {
    e.preventDefault();
    if (e.metaKey) {
      updateSelectedToIndex(0);
    } else if (e.altKey) {
      updateSelectedByGroup(-1);
    } else {
      updateSelectedByItem(-1);
    }
  };
  return <div
    tabIndex={-1}
    {...etc}
    cmdk-root=""
    onKeyDown={(e) => {
      etc.onKeyDown?.(e);
      if (!e.defaultPrevented) {
        switch (e.key) {
          case "n":
          case "j": {
            if (mergedProps.vimBindings && e.ctrlKey) {
              next(e);
            }
            break;
          }
          case "ArrowDown": {
            next(e);
            break;
          }
          case "p":
          case "k": {
            if (mergedProps.vimBindings && e.ctrlKey) {
              prev(e);
            }
            break;
          }
          case "ArrowUp": {
            prev(e);
            break;
          }
          case "Home": {
            e.preventDefault();
            updateSelectedToIndex(0);
            break;
          }
          case "End": {
            e.preventDefault();
            last();
            break;
          }
          case "Enter": {
            if (!e.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              const item = getSelectedItem();
              if (item) {
                const event = new Event(SELECT_EVENT);
                item.dispatchEvent(event);
              }
            }
          }
        }
      }
    }}
  >
      <label
    cmdk-label=""
    for={context.inputId}
    id={context.labelId}
    style={srOnlyStyles}
  >
        {mergedProps.label}
      </label>
      <StoreContext.Provider value={store}>
        <CommandContext.Provider value={context}>{props.children}</CommandContext.Provider>
      </StoreContext.Provider>
    </div>;
};
var Item = (props) => {
  const store = useStore();
  const id = createUniqueId();
  const [ref, setRef] = createSignal();
  const groupContext = useContext(GroupContext);
  const context = useCommand();
  const rendered = createMemo((wasRendered) => wasRendered || !!ref() && !props.disabled, false);
  onMount(() => {
    const unregisterValue = context.value(id, value, () => props.keywords);
    if (forceMount()) {
      onCleanup(unregisterValue);
      return;
    }
    const unregisterItem = context.item(id, groupContext()?.id);
    onCleanup(() => {
      unregisterItem();
      unregisterValue();
    });
  });
  const [textValue, setTextValue] = createSignal("");
  createEffect(
    on(ref, (el) => {
      if (el) setTextValue(el.textContent || "");
    })
  );
  const value = () => props.value || textValue();
  createEffect(
    on([value, ref], ([value2, el]) => {
      el?.setAttribute(VALUE_ATTR, value2);
    })
  );
  const forceMount = () => props.forceMount ?? groupContext()?.forceMount;
  const selected = useCmdk((state) => value() && value() == state.value);
  const render = useCmdk(
    (state) => !rendered() ? true : forceMount() ? true : context.filter() === false ? true : !state.search ? true : (state.filtered.items[id] || 0) > 0
  );
  createEffect(
    on(ref, (el) => {
      if (!el) return;
      el.addEventListener(SELECT_EVENT, onSelect);
      onCleanup(() => el.removeEventListener(SELECT_EVENT, onSelect));
    })
  );
  function onSelect() {
    select();
    props.onSelect?.(value());
  }
  function select() {
    store.setState("value", value(), true);
  }
  const [, etc] = splitProps(props, ["disabled", "onSelect", "value", "forceMount", "keywords"]);
  return <Show when={render()}>
      <div
    {...etc}
    ref={(el) => setRef(el)}
    id={id}
    cmdk-item=""
    role="option"
    aria-disabled={props.disabled ? "true" : "false"}
    aria-selected={selected() ? "true" : "false"}
    data-disabled={props.disabled ? "true" : "false"}
    data-selected={selected() ? "true" : "false"}
    onPointerMove={props.disabled || context.disablePointerSelection() ? void 0 : select}
    onClick={props.disabled ? void 0 : onSelect}
  >
        {props.children}
      </div>
    </Show>;
};
var Group = (props) => {
  const [, etc] = splitProps(props, ["heading", "value", "forceMount"]);
  const id = createUniqueId();
  const [ref, setRef] = createSignal();
  const [headerRef, setHeaderRef] = createSignal();
  const headingId = createUniqueId();
  const context = useCommand();
  const render = useCmdk((state) => {
    return props.forceMount ? true : context.filter() === false ? true : !state.search ? true : state.filtered.groups.includes(id);
  });
  onMount(() => {
    const unregisterValue = context.value(id, value);
    const unregisterGroup = context.group(id);
    onCleanup(() => {
      unregisterGroup();
      unregisterValue();
    });
  });
  const [headerValue, setHeaderValue] = createSignal("");
  createEffect(
    on(headerRef, (el) => {
      if (el) setHeaderValue(el.textContent || "");
    })
  );
  const value = () => props.value || headerValue();
  createEffect(
    on([value, ref], ([value2, el]) => {
      el?.setAttribute(VALUE_ATTR, value2);
    })
  );
  const contextValue = () => ({ id, forceMount: props.forceMount });
  return <div
    ref={mergeRefs(setRef, props.ref)}
    {...etc}
    cmdk-group=""
    id={id}
    role="presentation"
    hidden={render() ? void 0 : true}
  >
      <Show when={props.heading}>
        <div cmdk-group-heading="" ref={(el) => setHeaderRef(el)} aria-hidden="true" id={headingId}>
          {props.heading}
        </div>
      </Show>

      <div cmdk-group-items="" role="group" aria-labelledby={props.heading ? headingId : void 0}>
        <GroupContext.Provider value={contextValue}>{props.children}</GroupContext.Provider>
      </div>
    </div>;
};
var Separator = (props) => {
  const [, etc] = splitProps(props, ["alwaysRender"]);
  const render = useCmdk((state) => !state.search);
  return <Show when={props.alwaysRender || render()}>
      <div {...etc} cmdk-separator="" role="separator" />
    </Show>;
};
var Input = (props) => {
  const [, etc] = splitProps(props, ["onValueChange", "ref"]);
  const isControlled = () => props.value != null;
  const store = useStore();
  const search = useCmdk((state) => state.search);
  const value = useCmdk((state) => state.value);
  const context = useCommand();
  const selectedItemId = createMemo(() => {
    const item = context.listInnerRef()?.querySelector(`${ITEM_SELECTOR}[${VALUE_ATTR}="${encodeURIComponent(value())}"]`);
    return item?.getAttribute("id") || void 0;
  });
  createEffect(
    on(
      () => props.value,
      (value2) => {
        if (value2 != null) {
          store.setState("search", value2);
        }
      }
    )
  );
  return <input
    ref={props.ref}
    {...etc}
    cmdk-input=""
    autocomplete="off"
    autocorrect="off"
    spellcheck={false}
    aria-autocomplete="list"
    role="combobox"
    aria-expanded="true"
    aria-controls={context.listId}
    aria-labelledby={context.labelId}
    aria-activedescendant={selectedItemId()}
    id={context.inputId}
    type="text"
    value={isControlled() ? props.value : search()}
    onInput={(e) => {
      if (!isControlled()) {
        store.setState("search", e.currentTarget.value);
      }
      props.onValueChange?.(e.currentTarget.value);
    }}
  />;
};
var List = (props) => {
  const mergedProps = mergeProps({ label: "Suggestions" }, props);
  const [, etc] = splitProps(mergedProps, ["label", "children", "ref"]);
  const [wrapperRef, setWrapperRef] = createSignal();
  const [sizerRef, setSizerRef] = createSignal();
  const context = useCommand();
  createEffect(
    on([wrapperRef, sizerRef], ([wrapper, sizer]) => {
      if (!wrapper || !sizer) return;
      let animationFrame;
      const observer = new ResizeObserver(() => {
        animationFrame = requestAnimationFrame(() => {
          wrapper.style.setProperty(`--cmdk-list-height`, sizer.offsetHeight.toFixed(1) + "px");
        });
      });
      observer.observe(sizer);
      onCleanup(() => {
        cancelAnimationFrame(animationFrame);
        observer.unobserve(sizer);
      });
    })
  );
  return <div
    ref={mergeRefs(setWrapperRef, mergedProps.ref)}
    {...etc}
    cmdk-list=""
    role="listbox"
    aria-label={mergedProps.label}
    id={context.listId}
  >
      {SlottableWithNestedChildren(props, (child) => <div ref={mergeRefs(setSizerRef, context.setListInnerRef)} cmdk-list-sizer="">
          {child}
        </div>)}
    </div>;
};
var Dialog = (props) => {
  const [, dialogRootProps, etc] = splitProps(
    props,
    ["overlayClassName", "contentClassName", "container"],
    DIALOG_ROOT_KEYS
  );
  return <KobalteDialog.Root {...dialogRootProps}>
      <KobalteDialog.Portal mount={props.container}>
        <KobalteDialog.Overlay cmdk-overlay="" class={props.overlayClassName} />
        <KobalteDialog.Content aria-label={props.label} cmdk-dialog="" class={props.contentClassName}>
          <Command {...etc} />
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog.Root>;
};
var Empty = (props) => {
  const [mounted, setMounted] = createSignal(false);
  const render = useCmdk((state) => state.filtered.count === 0 && mounted());
  onMount(() => {
    setMounted(true);
  });
  return <Show when={render()}>
      <div {...props} cmdk-empty="" role="presentation" />
    </Show>;
};
var Loading = (props) => {
  const mergedProps = mergeProps({ label: "Loading..." }, props);
  const [, etc] = splitProps(mergedProps, ["progress", "children", "label"]);
  return <div
    {...etc}
    cmdk-loading=""
    role="progressbar"
    aria-valuenow={mergedProps.progress}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={mergedProps.label}
  >
      {SlottableWithNestedChildren(props, (child) => <div aria-hidden="true">{child}</div>)}
    </div>;
};
var pkg = Object.assign(Command, {
  List,
  Item,
  Input,
  Group,
  Separator,
  Dialog,
  Empty,
  Loading
});
function findNextSibling(el, selector) {
  let sibling = el.nextElementSibling;
  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.nextElementSibling;
  }
}
function findPreviousSibling(el, selector) {
  let sibling = el.previousElementSibling;
  while (sibling) {
    if (sibling.matches(selector)) return sibling;
    sibling = sibling.previousElementSibling;
  }
}
function useCmdk(selector) {
  const store = useStore();
  return () => selector(store.state);
}
var useSchedule = () => {
  let fns = /* @__PURE__ */ new Map();
  let queued = false;
  return (id, cb) => {
    fns.set(id, cb);
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      const pending = fns;
      fns = /* @__PURE__ */ new Map();
      pending.forEach((f) => {
        f();
      });
    });
  };
};
function mergeRefs(...refs) {
  return (el) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(el);
    }
  };
}
function SlottableWithNestedChildren(props, render) {
  return render(props.children);
}
var srOnlyStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  "white-space": "nowrap",
  "border-width": "0"
};
export {
  pkg as Command,
  Dialog as CommandDialog,
  Empty as CommandEmpty,
  Group as CommandGroup,
  Input as CommandInput,
  Item as CommandItem,
  List as CommandList,
  Loading as CommandLoading,
  Command as CommandRoot,
  Separator as CommandSeparator,
  defaultFilter,
  useCmdk as useCommandState
};
