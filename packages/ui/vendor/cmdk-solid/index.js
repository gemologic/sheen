// Vendored and modified by Gemologic Sheen from cmdk-solid@1.2.0; see package THIRD_PARTY_NOTICES.md.
import { commandScore } from './chunk/IOVUHIGA.js';
import { spread, mergeProps as mergeProps$1, insert, createComponent, effect, setAttribute, style, use, memo, template } from 'solid-js/web';
import { Dialog as Dialog$1 } from "#sheen-kobalte";
import { createContext, createSignal, mergeProps, createMemo, splitProps, createUniqueId, onMount, useContext, onCleanup, createEffect, on, Show, untrack } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

var _tmpl$ = /* @__PURE__ */ template(`<div tabindex=-1><label cmdk-label>`);
var _tmpl$2 = /* @__PURE__ */ template(`<div>`);
var _tmpl$3 = /* @__PURE__ */ template(`<div cmdk-group-heading aria-hidden=true>`);
var _tmpl$4 = /* @__PURE__ */ template(`<div><div cmdk-group-items role=group>`);
var _tmpl$5 = /* @__PURE__ */ template(`<input>`);
var _tmpl$6 = /* @__PURE__ */ template(`<div cmdk-list-sizer>`);
var _tmpl$7 = /* @__PURE__ */ template(`<div aria-hidden=true>`);
var GROUP_SELECTOR = `[cmdk-group=""]`;
var GROUP_HEADING_SELECTOR = `[cmdk-group-heading=""]`;
var ITEM_SELECTOR = `[cmdk-item=""]`;
var VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`;
var SELECT_EVENT = `cmdk-item-select`;
var VALUE_ATTR = `data-value`;
var DIALOG_ROOT_KEYS = ["open", "defaultOpen", "onOpenChange", "id", "modal", "preventScroll", "forceMount", "translations"];
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
  const mergedProps = mergeProps({
    vimBindings: true,
    disablePointerSelection: false
  }, props);
  const filtered = createMemo(() => {
    const skipFiltering = !state.search || mergedProps.shouldFilter === false;
    const items = state.items.reduce((acc, id) => {
      const registered = state.ids[id];
      acc[id] = skipFiltering ? 1 : registered ? score(registered.value(), registered.keywords?.()) : 0;
      return acc;
    }, {});
    const groups = Object.keys(state.groups).filter((groupId) => {
      return state.groups[groupId].some((id) => (items[id] || 0) > 0);
    });
    const count = Object.values(items).filter((score2) => score2 > 0).length;
    return {
      count,
      items,
      groups
    };
  });
  const [, etc] = splitProps(mergedProps, ["label", "children", "value", "onValueChange", "filter", "shouldFilter", "loop", "disablePointerSelection", "vimBindings"]);
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
      setState(produce((draft) => {
        draft.ids[id] = {
          value,
          keywords
        };
      }));
      return () => {
        setState(produce((draft) => {
          delete draft.ids[id];
        }));
      };
    },
    // Track item lifecycle (mount, unmount)
    item: (id, groupId) => {
      if (!listInnerRef()) {
        console.warn("Mount Command.Item inside a Command.List component.");
      }
      setState(produce((draft) => {
        if (!draft.items.includes(id)) draft.items.push(id);
        if (groupId) {
          const group = draft.groups[groupId] ??= [];
          if (!group.includes(id)) group.push(id);
        }
      }));
      schedule(3, () => {
        if (!state.value) {
          selectFirstItem();
        }
      });
      return () => {
        setState(produce((draft) => {
          const index = draft.items.indexOf(id);
          if (index !== -1) draft.items.splice(index, 1);
          if (groupId) {
            const group = draft.groups[groupId];
            const groupIndex = group?.indexOf(id) ?? -1;
            if (group && groupIndex !== -1) group.splice(groupIndex, 1);
          }
        }));
        const selectedItem = getSelectedItem();
        if (selectedItem?.getAttribute("id") === id) schedule(1, () => selectFirstItem());
      };
    },
    // Track group lifecycle (mount, unmount)
    group: (id) => {
      if (!listInnerRef()) {
        console.warn("Mount Command.Group inside a Command.List component.");
      }
      setState(produce((draft) => {
        draft.groups[id] ??= [];
      }));
      return () => {
        setState(produce((draft) => {
          delete draft.groups[id];
        }));
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
          item.closest(GROUP_SELECTOR)?.querySelector(GROUP_HEADING_SELECTOR)?.scrollIntoView({
            block: "nearest"
          });
        }
        item.scrollIntoView({
          block: "nearest"
        });
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
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild;
    spread(_el$, mergeProps$1(etc, {
      "cmdk-root": "",
      "onKeyDown": (e) => {
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
      }
    }), false, true);
    insert(_el$2, () => mergedProps.label);
    insert(_el$, createComponent(StoreContext.Provider, {
      value: store,
      get children() {
        return createComponent(CommandContext.Provider, {
          value: context,
          get children() {
            return props.children;
          }
        });
      }
    }), null);
    effect((_p$) => {
      var _v$ = context.inputId, _v$2 = context.labelId, _v$3 = srOnlyStyles;
      _v$ !== _p$.e && setAttribute(_el$2, "for", _p$.e = _v$);
      _v$2 !== _p$.t && setAttribute(_el$2, "id", _p$.t = _v$2);
      _p$.a = style(_el$2, _v$3, _p$.a);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
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
  createEffect(on(ref, (el) => {
    if (el) setTextValue(el.textContent || "");
  }));
  const value = () => props.value || textValue();
  createEffect(on([value, ref], ([value2, el]) => {
    el?.setAttribute(VALUE_ATTR, value2);
  }));
  const forceMount = () => props.forceMount ?? groupContext()?.forceMount;
  const selected = useCmdk((state) => value() && value() == state.value);
  const render = useCmdk((state) => !rendered() ? true : forceMount() ? true : context.filter() === false ? true : !state.search ? true : (state.filtered.items[id] || 0) > 0);
  createEffect(on(ref, (el) => {
    if (!el) return;
    el.addEventListener(SELECT_EVENT, onSelect);
    onCleanup(() => el.removeEventListener(SELECT_EVENT, onSelect));
  }));
  function onSelect() {
    select();
    props.onSelect?.(value());
  }
  function select() {
    store.setState("value", value(), true);
  }
  const [, etc] = splitProps(props, ["disabled", "onSelect", "value", "forceMount", "keywords"]);
  return createComponent(Show, {
    get when() {
      return render();
    },
    get children() {
      var _el$3 = _tmpl$2();
      use((el) => setRef(el), _el$3);
      spread(_el$3, mergeProps$1(etc, {
        "id": id,
        "cmdk-item": "",
        "role": "option",
        get ["aria-disabled"]() {
          return props.disabled ? "true" : "false";
        },
        get ["aria-selected"]() {
          return selected() ? "true" : "false";
        },
        get ["data-disabled"]() {
          return props.disabled ? "true" : "false";
        },
        get ["data-selected"]() {
          return selected() ? "true" : "false";
        },
        get onPointerMove() {
          return props.disabled || context.disablePointerSelection() ? void 0 : select;
        },
        get onClick() {
          return props.disabled ? void 0 : onSelect;
        }
      }), false, true);
      insert(_el$3, () => props.children);
      return _el$3;
    }
  });
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
  createEffect(on(headerRef, (el) => {
    if (el) setHeaderValue(el.textContent || "");
  }));
  const value = () => props.value || headerValue();
  createEffect(on([value, ref], ([value2, el]) => {
    el?.setAttribute(VALUE_ATTR, value2);
  }));
  const contextValue = () => ({
    id,
    forceMount: props.forceMount
  });
  return (() => {
    var _el$4 = _tmpl$4(), _el$6 = _el$4.firstChild;
    var _ref$ = mergeRefs(setRef, props.ref);
    typeof _ref$ === "function" && use(_ref$, _el$4);
    spread(_el$4, mergeProps$1(etc, {
      "cmdk-group": "",
      "id": id,
      "role": "presentation",
      get hidden() {
        return render() ? void 0 : true;
      }
    }), false, true);
    insert(_el$4, createComponent(Show, {
      get when() {
        return props.heading;
      },
      get children() {
        var _el$5 = _tmpl$3();
        use((el) => setHeaderRef(el), _el$5);
        setAttribute(_el$5, "id", headingId);
        insert(_el$5, () => props.heading);
        return _el$5;
      }
    }), _el$6);
    insert(_el$6, createComponent(GroupContext.Provider, {
      value: contextValue,
      get children() {
        return props.children;
      }
    }));
    effect(() => setAttribute(_el$6, "aria-labelledby", props.heading ? headingId : void 0));
    return _el$4;
  })();
};
var Separator = (props) => {
  const [, etc] = splitProps(props, ["alwaysRender"]);
  const render = useCmdk((state) => !state.search);
  return createComponent(Show, {
    get when() {
      return props.alwaysRender || render();
    },
    get children() {
      var _el$7 = _tmpl$2();
      spread(_el$7, mergeProps$1(etc, {
        "cmdk-separator": "",
        "role": "separator"
      }), false, false);
      return _el$7;
    }
  });
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
  createEffect(on(() => props.value, (value2) => {
    if (value2 != null) {
      store.setState("search", value2);
    }
  }));
  return (() => {
    var _el$8 = _tmpl$5();
    var _ref$2 = props.ref;
    typeof _ref$2 === "function" ? use(_ref$2, _el$8) : props.ref = _el$8;
    spread(_el$8, mergeProps$1(etc, {
      "cmdk-input": "",
      "autocomplete": "off",
      "autocorrect": "off",
      "spellcheck": false,
      "aria-autocomplete": "list",
      "role": "combobox",
      "aria-expanded": "true",
      get ["aria-controls"]() {
        return context.listId;
      },
      get ["aria-labelledby"]() {
        return context.labelId;
      },
      get ["aria-activedescendant"]() {
        return selectedItemId();
      },
      get id() {
        return context.inputId;
      },
      "type": "text",
      get value() {
        return memo(() => !!isControlled())() ? props.value : search();
      },
      "onInput": (e) => {
        if (!isControlled()) {
          store.setState("search", e.currentTarget.value);
        }
        props.onValueChange?.(e.currentTarget.value);
      }
    }), false, false);
    return _el$8;
  })();
};
var List = (props) => {
  const mergedProps = mergeProps({
    label: "Suggestions"
  }, props);
  const [, etc] = splitProps(mergedProps, ["label", "children", "ref"]);
  const [wrapperRef, setWrapperRef] = createSignal();
  const [sizerRef, setSizerRef] = createSignal();
  const context = useCommand();
  createEffect(on([wrapperRef, sizerRef], ([wrapper, sizer]) => {
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
  }));
  return (() => {
    var _el$9 = _tmpl$2();
    var _ref$3 = mergeRefs(setWrapperRef, mergedProps.ref);
    typeof _ref$3 === "function" && use(_ref$3, _el$9);
    spread(_el$9, mergeProps$1(etc, {
      "cmdk-list": "",
      "role": "listbox",
      get ["aria-label"]() {
        return mergedProps.label;
      },
      get id() {
        return context.listId;
      }
    }), false, true);
    insert(_el$9, () => SlottableWithNestedChildren(props, (child) => (() => {
      var _el$0 = _tmpl$6();
      var _ref$4 = mergeRefs(setSizerRef, context.setListInnerRef);
      typeof _ref$4 === "function" && use(_ref$4, _el$0);
      insert(_el$0, child);
      return _el$0;
    })()));
    return _el$9;
  })();
};
var Dialog = (props) => {
  const [, dialogRootProps, etc] = splitProps(props, ["overlayClassName", "contentClassName", "container"], DIALOG_ROOT_KEYS);
  return createComponent(Dialog$1.Root, mergeProps$1(dialogRootProps, {
    get children() {
      return createComponent(Dialog$1.Portal, {
        get mount() {
          return props.container;
        },
        get children() {
          return [createComponent(Dialog$1.Overlay, {
            "cmdk-overlay": "",
            get ["class"]() {
              return props.overlayClassName;
            }
          }), createComponent(Dialog$1.Content, {
            get ["aria-label"]() {
              return props.label;
            },
            "cmdk-dialog": "",
            get ["class"]() {
              return props.contentClassName;
            },
            get children() {
              return createComponent(Command, etc);
            }
          })];
        }
      });
    }
  }));
};
var Empty = (props) => {
  const [mounted, setMounted] = createSignal(false);
  const render = useCmdk((state) => state.filtered.count === 0 && mounted());
  onMount(() => {
    setMounted(true);
  });
  return createComponent(Show, {
    get when() {
      return render();
    },
    get children() {
      var _el$1 = _tmpl$2();
      spread(_el$1, mergeProps$1(props, {
        "cmdk-empty": "",
        "role": "presentation"
      }), false, false);
      return _el$1;
    }
  });
};
var Loading = (props) => {
  const mergedProps = mergeProps({
    label: "Loading..."
  }, props);
  const [, etc] = splitProps(mergedProps, ["progress", "children", "label"]);
  return (() => {
    var _el$10 = _tmpl$2();
    spread(_el$10, mergeProps$1(etc, {
      "cmdk-loading": "",
      "role": "progressbar",
      get ["aria-valuenow"]() {
        return mergedProps.progress;
      },
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      get ["aria-label"]() {
        return mergedProps.label;
      }
    }), false, true);
    insert(_el$10, () => SlottableWithNestedChildren(props, (child) => (() => {
      var _el$11 = _tmpl$7();
      insert(_el$11, child);
      return _el$11;
    })()));
    return _el$10;
  })();
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

export { pkg as Command, Dialog as CommandDialog, Empty as CommandEmpty, Group as CommandGroup, Input as CommandInput, Item as CommandItem, List as CommandList, Loading as CommandLoading, Command as CommandRoot, Separator as CommandSeparator, defaultFilter, useCmdk as useCommandState };
