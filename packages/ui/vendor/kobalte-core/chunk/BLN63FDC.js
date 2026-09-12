// Vendored and modified by Gemologic Sheen from @kobalte/core@0.13.13; see package THIRD_PARTY_NOTICES.md.
import { accessWith } from "#sheen-kobalte-utils";
import { createSignal, createMemo, untrack } from 'solid-js';

// src/primitives/create-controllable-signal/create-controllable-signal.ts
function createControllableSignal(props) {
  const [_value, _setValue] = createSignal(props.defaultValue?.());
  const isControlled = createMemo(() => props.value?.() !== void 0);
  const value = createMemo(() => isControlled() ? props.value?.() : _value());
  const setValue = (next) => {
    untrack(() => {
      const nextValue = accessWith(next, value());
      if (!Object.is(nextValue, value())) {
        if (!isControlled()) {
          _setValue(nextValue);
        }
        props.onChange?.(nextValue);
      }
      return nextValue;
    });
  };
  return [value, setValue];
}
function createControllableBooleanSignal(props) {
  const [_value, setValue] = createControllableSignal(props);
  const value = () => _value() ?? false;
  return [value, setValue];
}
function createControllableArraySignal(props) {
  const [_value, setValue] = createControllableSignal(props);
  const value = () => _value() ?? [];
  return [value, setValue];
}
function createControllableSetSignal(props) {
  const [_value, setValue] = createControllableSignal(props);
  const value = () => _value() ?? /* @__PURE__ */ new Set();
  return [value, setValue];
}

export { createControllableArraySignal, createControllableBooleanSignal, createControllableSetSignal, createControllableSignal };
