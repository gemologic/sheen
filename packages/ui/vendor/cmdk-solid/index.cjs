// Vendored and modified by Gemologic Sheen from cmdk-solid@1.2.0; see package THIRD_PARTY_NOTICES.md.
'use strict';

var web = require('solid-js/web');
var core = require("#sheen-kobalte");
var solidJs = require('solid-js');
var store = require('solid-js/store');

// src/index.tsx

// src/command-score.ts
var SCORE_CONTINUE_MATCH = 1;
var SCORE_SPACE_WORD_JUMP = 0.9;
var SCORE_NON_SPACE_WORD_JUMP = 0.8;
var SCORE_CHARACTER_JUMP = 0.17;
var SCORE_TRANSPOSITION = 0.1;
var PENALTY_SKIPPED = 0.999;
var PENALTY_CASE_MISMATCH = 0.9999;
var PENALTY_NOT_COMPLETE = 0.99;
var IS_GAP_REGEXP = /[\\\/_+.#"@\[\(\{&]/;
var COUNT_GAPS_REGEXP = /[\\\/_+.#"@\[\(\{&]/g;
var IS_SPACE_REGEXP = /[\s-]/;
var COUNT_SPACE_REGEXP = /[\s-]/g;
function commandScoreInner(string, abbreviation, lowerString, lowerAbbreviation, stringIndex, abbreviationIndex, memoizedResults) {
  if (abbreviationIndex === abbreviation.length) {
    if (stringIndex === string.length) {
      return SCORE_CONTINUE_MATCH;
    }
    return PENALTY_NOT_COMPLETE;
  }
  var memoizeKey = `${stringIndex},${abbreviationIndex}`;
  if (memoizedResults[memoizeKey] !== void 0) {
    return memoizedResults[memoizeKey];
  }
  var abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex);
  var index = lowerString.indexOf(abbreviationChar, stringIndex);
  var highScore = 0;
  var score, transposedScore, wordBreaks, spaceBreaks;
  while (index >= 0) {
    score = commandScoreInner(
      string,
      abbreviation,
      lowerString,
      lowerAbbreviation,
      index + 1,
      abbreviationIndex + 1,
      memoizedResults
    );
    if (score > highScore) {
      if (index === stringIndex) {
        score *= SCORE_CONTINUE_MATCH;
      } else if (IS_GAP_REGEXP.test(string.charAt(index - 1))) {
        score *= SCORE_NON_SPACE_WORD_JUMP;
        wordBreaks = string.slice(stringIndex, index - 1).match(COUNT_GAPS_REGEXP);
        if (wordBreaks && stringIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, wordBreaks.length);
        }
      } else if (IS_SPACE_REGEXP.test(string.charAt(index - 1))) {
        score *= SCORE_SPACE_WORD_JUMP;
        spaceBreaks = string.slice(stringIndex, index - 1).match(COUNT_SPACE_REGEXP);
        if (spaceBreaks && stringIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, spaceBreaks.length);
        }
      } else {
        score *= SCORE_CHARACTER_JUMP;
        if (stringIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, index - stringIndex);
        }
      }
      if (string.charAt(index) !== abbreviation.charAt(abbreviationIndex)) {
        score *= PENALTY_CASE_MISMATCH;
      }
    }
    if (score < SCORE_TRANSPOSITION && lowerString.charAt(index - 1) === lowerAbbreviation.charAt(abbreviationIndex + 1) || lowerAbbreviation.charAt(abbreviationIndex + 1) === lowerAbbreviation.charAt(abbreviationIndex) && // allow duplicate letters. Ref #7428
    lowerString.charAt(index - 1) !== lowerAbbreviation.charAt(abbreviationIndex)) {
      transposedScore = commandScoreInner(
        string,
        abbreviation,
        lowerString,
        lowerAbbreviation,
        index + 1,
        abbreviationIndex + 2,
        memoizedResults
      );
      if (transposedScore * SCORE_TRANSPOSITION > score) {
        score = transposedScore * SCORE_TRANSPOSITION;
      }
    }
    if (score > highScore) {
      highScore = score;
    }
    index = lowerString.indexOf(abbreviationChar, index + 1);
  }
  memoizedResults[memoizeKey] = highScore;
  return highScore;
}
function formatInput(string) {
  return string.toLowerCase().replace(COUNT_SPACE_REGEXP, " ");
}
function commandScore(string, abbreviation, aliases) {
  string = aliases && aliases.length > 0 ? `${string + " " + aliases.join(" ")}` : string;
  return commandScoreInner(string, abbreviation, formatInput(string), formatInput(abbreviation), 0, 0, {});
}

// src/index.tsx
var _tmpl$ = /* @__PURE__ */ web.template(`<div tabindex=-1><label cmdk-label>`);
var _tmpl$2 = /* @__PURE__ */ web.template(`<div>`);
var _tmpl$3 = /* @__PURE__ */ web.template(`<div cmdk-group-heading aria-hidden=true>`);
var _tmpl$4 = /* @__PURE__ */ web.template(`<div><div cmdk-group-items role=group>`);
var _tmpl$5 = /* @__PURE__ */ web.template(`<input>`);
var _tmpl$6 = /* @__PURE__ */ web.template(`<div cmdk-list-sizer>`);
var _tmpl$7 = /* @__PURE__ */ web.template(`<div aria-hidden=true>`);
var GROUP_SELECTOR = `[cmdk-group=""]`;
var GROUP_HEADING_SELECTOR = `[cmdk-group-heading=""]`;
var ITEM_SELECTOR = `[cmdk-item=""]`;
var VALID_ITEM_SELECTOR = `${ITEM_SELECTOR}:not([aria-disabled="true"])`;
var SELECT_EVENT = `cmdk-item-select`;
var VALUE_ATTR = `data-value`;
var DIALOG_ROOT_KEYS = ["open", "defaultOpen", "onOpenChange", "id", "modal", "preventScroll", "forceMount", "translations"];
exports.defaultFilter = (value, search, keywords) => commandScore(value, search, keywords);
var CommandContext = solidJs.createContext();
var useCommand = () => solidJs.useContext(CommandContext);
var StoreContext = solidJs.createContext();
var useStore = () => solidJs.useContext(StoreContext);
var GroupContext = solidJs.createContext(() => void 0);
exports.CommandRoot = (props) => {
  const [uncontrolledValue, setUncontrolledValue] = solidJs.createSignal(props.value?.trim() ?? props.defaultValue ?? "");
  const [state, setState] = store.createStore({
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
  const mergedProps = solidJs.mergeProps({
    vimBindings: true,
    disablePointerSelection: false
  }, props);
  const filtered = solidJs.createMemo(() => {
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
  const [, etc] = solidJs.splitProps(mergedProps, ["label", "children", "value", "onValueChange", "filter", "shouldFilter", "loop", "disablePointerSelection", "vimBindings"]);
  const listId = solidJs.createUniqueId();
  const labelId = solidJs.createUniqueId();
  const inputId = solidJs.createUniqueId();
  const [listInnerRef, setListInnerRef] = solidJs.createSignal(null);
  const schedule = useSchedule();
  solidJs.onMount(() => {
    schedule(6, scrollSelectedIntoView);
  });
  const store$1 = {
    state,
    setState: (key, value, opts) => {
      if (solidJs.untrack(() => Object.is(state[key], value))) return;
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
      setState(store.produce((draft) => {
        draft.ids[id] = {
          value,
          keywords
        };
      }));
      return () => {
        setState(store.produce((draft) => {
          delete draft.ids[id];
        }));
      };
    },
    // Track item lifecycle (mount, unmount)
    item: (id, groupId) => {
      if (!listInnerRef()) {
        console.warn("Mount Command.Item inside a Command.List component.");
      }
      setState(store.produce((draft) => {
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
        setState(store.produce((draft) => {
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
      setState(store.produce((draft) => {
        draft.groups[id] ??= [];
      }));
      return () => {
        setState(store.produce((draft) => {
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
    const filter = mergedProps.filter ?? exports.defaultFilter;
    return value ? filter(value, state.search, keywords) : 0;
  }
  function selectFirstItem() {
    const item = getValidItems().find((item2) => item2.getAttribute("aria-disabled") !== "true");
    const value = item?.getAttribute(VALUE_ATTR) || "";
    store$1.setState("value", value);
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
    if (item) store$1.setState("value", item.getAttribute(VALUE_ATTR) || "");
  }
  function updateSelectedByItem(change) {
    const selected = getSelectedItem();
    const items = getValidItems();
    const index = items.findIndex((item) => item === selected);
    let newSelected = items[index + change];
    if (mergedProps.loop) {
      newSelected = index + change < 0 ? items[items.length - 1] : index + change === items.length ? items[0] : items[index + change];
    }
    if (newSelected) store$1.setState("value", newSelected.getAttribute(VALUE_ATTR) || "");
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
      store$1.setState("value", item.getAttribute(VALUE_ATTR) || "");
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
    web.spread(_el$, web.mergeProps(etc, {
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
    web.insert(_el$2, () => mergedProps.label);
    web.insert(_el$, web.createComponent(StoreContext.Provider, {
      value: store$1,
      get children() {
        return web.createComponent(CommandContext.Provider, {
          value: context,
          get children() {
            return props.children;
          }
        });
      }
    }), null);
    web.effect((_p$) => {
      var _v$ = context.inputId, _v$2 = context.labelId, _v$3 = srOnlyStyles;
      _v$ !== _p$.e && web.setAttribute(_el$2, "for", _p$.e = _v$);
      _v$2 !== _p$.t && web.setAttribute(_el$2, "id", _p$.t = _v$2);
      _p$.a = web.style(_el$2, _v$3, _p$.a);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$;
  })();
};
exports.CommandItem = (props) => {
  const store = useStore();
  const id = solidJs.createUniqueId();
  const [ref, setRef] = solidJs.createSignal();
  const groupContext = solidJs.useContext(GroupContext);
  const context = useCommand();
  const rendered = solidJs.createMemo((wasRendered) => wasRendered || !!ref() && !props.disabled, false);
  solidJs.onMount(() => {
    const unregisterValue = context.value(id, value, () => props.keywords);
    if (forceMount()) {
      solidJs.onCleanup(unregisterValue);
      return;
    }
    const unregisterItem = context.item(id, groupContext()?.id);
    solidJs.onCleanup(() => {
      unregisterItem();
      unregisterValue();
    });
  });
  const [textValue, setTextValue] = solidJs.createSignal("");
  solidJs.createEffect(solidJs.on(ref, (el) => {
    if (el) setTextValue(el.textContent || "");
  }));
  const value = () => props.value || textValue();
  solidJs.createEffect(solidJs.on([value, ref], ([value2, el]) => {
    el?.setAttribute(VALUE_ATTR, value2);
  }));
  const forceMount = () => props.forceMount ?? groupContext()?.forceMount;
  const selected = useCmdk((state) => value() && value() == state.value);
  const render = useCmdk((state) => !rendered() ? true : forceMount() ? true : context.filter() === false ? true : !state.search ? true : (state.filtered.items[id] || 0) > 0);
  solidJs.createEffect(solidJs.on(ref, (el) => {
    if (!el) return;
    el.addEventListener(SELECT_EVENT, onSelect);
    solidJs.onCleanup(() => el.removeEventListener(SELECT_EVENT, onSelect));
  }));
  function onSelect() {
    select();
    props.onSelect?.(value());
  }
  function select() {
    store.setState("value", value(), true);
  }
  const [, etc] = solidJs.splitProps(props, ["disabled", "onSelect", "value", "forceMount", "keywords"]);
  return web.createComponent(solidJs.Show, {
    get when() {
      return render();
    },
    get children() {
      var _el$3 = _tmpl$2();
      web.use((el) => setRef(el), _el$3);
      web.spread(_el$3, web.mergeProps(etc, {
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
      web.insert(_el$3, () => props.children);
      return _el$3;
    }
  });
};
exports.CommandGroup = (props) => {
  const [, etc] = solidJs.splitProps(props, ["heading", "value", "forceMount"]);
  const id = solidJs.createUniqueId();
  const [ref, setRef] = solidJs.createSignal();
  const [headerRef, setHeaderRef] = solidJs.createSignal();
  const headingId = solidJs.createUniqueId();
  const context = useCommand();
  const render = useCmdk((state) => {
    return props.forceMount ? true : context.filter() === false ? true : !state.search ? true : state.filtered.groups.includes(id);
  });
  solidJs.onMount(() => {
    const unregisterValue = context.value(id, value);
    const unregisterGroup = context.group(id);
    solidJs.onCleanup(() => {
      unregisterGroup();
      unregisterValue();
    });
  });
  const [headerValue, setHeaderValue] = solidJs.createSignal("");
  solidJs.createEffect(solidJs.on(headerRef, (el) => {
    if (el) setHeaderValue(el.textContent || "");
  }));
  const value = () => props.value || headerValue();
  solidJs.createEffect(solidJs.on([value, ref], ([value2, el]) => {
    el?.setAttribute(VALUE_ATTR, value2);
  }));
  const contextValue = () => ({
    id,
    forceMount: props.forceMount
  });
  return (() => {
    var _el$4 = _tmpl$4(), _el$6 = _el$4.firstChild;
    var _ref$ = mergeRefs(setRef, props.ref);
    typeof _ref$ === "function" && web.use(_ref$, _el$4);
    web.spread(_el$4, web.mergeProps(etc, {
      "cmdk-group": "",
      "id": id,
      "role": "presentation",
      get hidden() {
        return render() ? void 0 : true;
      }
    }), false, true);
    web.insert(_el$4, web.createComponent(solidJs.Show, {
      get when() {
        return props.heading;
      },
      get children() {
        var _el$5 = _tmpl$3();
        web.use((el) => setHeaderRef(el), _el$5);
        web.setAttribute(_el$5, "id", headingId);
        web.insert(_el$5, () => props.heading);
        return _el$5;
      }
    }), _el$6);
    web.insert(_el$6, web.createComponent(GroupContext.Provider, {
      value: contextValue,
      get children() {
        return props.children;
      }
    }));
    web.effect(() => web.setAttribute(_el$6, "aria-labelledby", props.heading ? headingId : void 0));
    return _el$4;
  })();
};
exports.CommandSeparator = (props) => {
  const [, etc] = solidJs.splitProps(props, ["alwaysRender"]);
  const render = useCmdk((state) => !state.search);
  return web.createComponent(solidJs.Show, {
    get when() {
      return props.alwaysRender || render();
    },
    get children() {
      var _el$7 = _tmpl$2();
      web.spread(_el$7, web.mergeProps(etc, {
        "cmdk-separator": "",
        "role": "separator"
      }), false, false);
      return _el$7;
    }
  });
};
exports.CommandInput = (props) => {
  const [, etc] = solidJs.splitProps(props, ["onValueChange", "ref"]);
  const isControlled = () => props.value != null;
  const store = useStore();
  const search = useCmdk((state) => state.search);
  const value = useCmdk((state) => state.value);
  const context = useCommand();
  const selectedItemId = solidJs.createMemo(() => {
    const item = context.listInnerRef()?.querySelector(`${ITEM_SELECTOR}[${VALUE_ATTR}="${encodeURIComponent(value())}"]`);
    return item?.getAttribute("id") || void 0;
  });
  solidJs.createEffect(solidJs.on(() => props.value, (value2) => {
    if (value2 != null) {
      store.setState("search", value2);
    }
  }));
  return (() => {
    var _el$8 = _tmpl$5();
    var _ref$2 = props.ref;
    typeof _ref$2 === "function" ? web.use(_ref$2, _el$8) : props.ref = _el$8;
    web.spread(_el$8, web.mergeProps(etc, {
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
        return web.memo(() => !!isControlled())() ? props.value : search();
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
exports.CommandList = (props) => {
  const mergedProps = solidJs.mergeProps({
    label: "Suggestions"
  }, props);
  const [, etc] = solidJs.splitProps(mergedProps, ["label", "children", "ref"]);
  const [wrapperRef, setWrapperRef] = solidJs.createSignal();
  const [sizerRef, setSizerRef] = solidJs.createSignal();
  const context = useCommand();
  solidJs.createEffect(solidJs.on([wrapperRef, sizerRef], ([wrapper, sizer]) => {
    if (!wrapper || !sizer) return;
    let animationFrame;
    const observer = new ResizeObserver(() => {
      animationFrame = requestAnimationFrame(() => {
        wrapper.style.setProperty(`--cmdk-list-height`, sizer.offsetHeight.toFixed(1) + "px");
      });
    });
    observer.observe(sizer);
    solidJs.onCleanup(() => {
      cancelAnimationFrame(animationFrame);
      observer.unobserve(sizer);
    });
  }));
  return (() => {
    var _el$9 = _tmpl$2();
    var _ref$3 = mergeRefs(setWrapperRef, mergedProps.ref);
    typeof _ref$3 === "function" && web.use(_ref$3, _el$9);
    web.spread(_el$9, web.mergeProps(etc, {
      "cmdk-list": "",
      "role": "listbox",
      get ["aria-label"]() {
        return mergedProps.label;
      },
      get id() {
        return context.listId;
      }
    }), false, true);
    web.insert(_el$9, () => SlottableWithNestedChildren(props, (child) => (() => {
      var _el$0 = _tmpl$6();
      var _ref$4 = mergeRefs(setSizerRef, context.setListInnerRef);
      typeof _ref$4 === "function" && web.use(_ref$4, _el$0);
      web.insert(_el$0, child);
      return _el$0;
    })()));
    return _el$9;
  })();
};
exports.CommandDialog = (props) => {
  const [, dialogRootProps, etc] = solidJs.splitProps(props, ["overlayClassName", "contentClassName", "container"], DIALOG_ROOT_KEYS);
  return web.createComponent(core.Dialog.Root, web.mergeProps(dialogRootProps, {
    get children() {
      return web.createComponent(core.Dialog.Portal, {
        get mount() {
          return props.container;
        },
        get children() {
          return [web.createComponent(core.Dialog.Overlay, {
            "cmdk-overlay": "",
            get ["class"]() {
              return props.overlayClassName;
            }
          }), web.createComponent(core.Dialog.Content, {
            get ["aria-label"]() {
              return props.label;
            },
            "cmdk-dialog": "",
            get ["class"]() {
              return props.contentClassName;
            },
            get children() {
              return web.createComponent(exports.CommandRoot, etc);
            }
          })];
        }
      });
    }
  }));
};
exports.CommandEmpty = (props) => {
  const [mounted, setMounted] = solidJs.createSignal(false);
  const render = useCmdk((state) => state.filtered.count === 0 && mounted());
  solidJs.onMount(() => {
    setMounted(true);
  });
  return web.createComponent(solidJs.Show, {
    get when() {
      return render();
    },
    get children() {
      var _el$1 = _tmpl$2();
      web.spread(_el$1, web.mergeProps(props, {
        "cmdk-empty": "",
        "role": "presentation"
      }), false, false);
      return _el$1;
    }
  });
};
exports.CommandLoading = (props) => {
  const mergedProps = solidJs.mergeProps({
    label: "Loading..."
  }, props);
  const [, etc] = solidJs.splitProps(mergedProps, ["progress", "children", "label"]);
  return (() => {
    var _el$10 = _tmpl$2();
    web.spread(_el$10, web.mergeProps(etc, {
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
    web.insert(_el$10, () => SlottableWithNestedChildren(props, (child) => (() => {
      var _el$11 = _tmpl$7();
      web.insert(_el$11, child);
      return _el$11;
    })()));
    return _el$10;
  })();
};
exports.Command = Object.assign(exports.CommandRoot, {
  List: exports.CommandList,
  Item: exports.CommandItem,
  Input: exports.CommandInput,
  Group: exports.CommandGroup,
  Separator: exports.CommandSeparator,
  Dialog: exports.CommandDialog,
  Empty: exports.CommandEmpty,
  Loading: exports.CommandLoading
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

exports.useCommandState = useCmdk;
