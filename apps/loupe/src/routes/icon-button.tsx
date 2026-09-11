import { createSignal } from "solid-js";
import { Button, IconButton, Input, ThemeScope } from "@gemologic/sheen";
import type { ThemeState } from "@gemologic/sheen";

export default function IconButtonFixture() {
  const [count, setCount] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [renamed, setRenamed] = createSignal(false);
  const [submitted, setSubmitted] = createSignal("");
  const [density, setDensity] = createSignal<ThemeState["density"]>("comfortable");
  const [rtl, setRtl] = createSignal(false);
  const [light, setLight] = createSignal(false);
  return <ThemeScope density={density()} direction={rtl() ? "rtl" : "ltr"} theme={light() ? "paper" : "obsidian"} mode={light() ? "light" : "dark"}>
    <main onKeyDown={event => {
      if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        setLight(value => !value);
      }
    }}>
    <IconButton label={renamed() ? "Additional actions" : "More actions"} loading={loading()} onClick={() => setCount(value => value + 1)}>⋯</IconButton>
    <IconButton label="Extra small action" size="xs"><svg viewBox="0 0 16 16" width="128" height="128"><path d="M3 8h10M8 3v10" stroke="currentColor" /></svg></IconButton>
    <IconButton label="Small action" size="sm">+</IconButton>
    <IconButton label="Large action" size="lg">+</IconButton>
    <Button onClick={() => setLoading(value => !value)}>Toggle icon loading</Button>
    <Button onClick={() => setRenamed(value => !value)}>Rename action</Button>
    <output aria-label="Icon activation count">{count()}</output>
    <form aria-label="Icon actions form" onSubmit={event => {
      event.preventDefault();
      const submitter = event.submitter;
      const form = event.currentTarget;
      const values = new FormData(form, submitter);
      setSubmitted(JSON.stringify([...values.entries()]));
    }}>
      <Input label="Icon form draft" name="draft" value="Initial value" />
      <IconButton label="Submit icon form" type="submit" name="operation" value="save" loading={loading()}>+</IconButton>
      <IconButton label="Reset icon form" type="reset">↺</IconButton>
    </form>
    <output aria-label="Icon form submission">{submitted()}</output>
    <Button onClick={() => setDensity("compact")}>Compact icons</Button>
    <Button onClick={() => setDensity("comfortable")}>Comfortable icons</Button>
    <Button onClick={() => setDensity("spacious")}>Spacious icons</Button>
    <Button onClick={() => setRtl(value => !value)}>Toggle icon direction</Button>
    <p>Alt+T changes the scoped theme while retaining keyboard focus.</p>
  </main></ThemeScope>;
}
