import { createSignal } from "solid-js";
import { Button, Field, Input, InputGroup, SearchInput, Stack, ThemeScope } from "@gemologic/sheen";

export default function FormsFixture() {
  const [invalid, setInvalid] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [euro, setEuro] = createSignal(false);
  const [query, setQuery] = createSignal("BTC");
  const [nativeInputs, setNativeInputs] = createSignal(0);
  const [preventReset, setPreventReset] = createSignal(false);
  const [resetQuery, setResetQuery] = createSignal("ETH");
  return <main>
    <h1>Field composition</h1>
    <Stack>
      <Button onClick={() => setInvalid(value => !value)}>Toggle validation</Button>
      <Input label="Account" description="Enter the account name." error={invalid() ? "Account is unavailable." : ""} required onKeyDown={event => { if (event.key === "F8") setInvalid(value => !value); }} />
      <Field label="Notes" description="Shared with your team.">{control => <textarea {...control} />}</Field>
      <Input label="Disabled account" disabled />
      <Button onClick={() => setRtl(value => !value)}>Toggle group direction</Button>
      <ThemeScope direction={rtl() ? "rtl" : "ltr"}>
        <InputGroup label="Amount" description={euro() ? "Amount in EUR" : "Amount in USD"} startContent={<Button onClick={() => setEuro(value => !value)}>Change unit</Button>} endContent={euro() ? "EUR" : "USD"} />
      </ThemeScope>
      <SearchInput label="Uncontrolled search" defaultValue="ETH" onInput={() => setNativeInputs(value => value + 1)} />
      <SearchInput label="Controlled search" value={query()} onValueChange={setQuery} />
      <SearchInput label="Fixed search" value="Fixed" />
      <Button onClick={() => setPreventReset(value => !value)}>Toggle reset prevention</Button>
      <form aria-label="Search reset fixture" onReset={event => { if (preventReset()) event.preventDefault(); }}>
        <SearchInput label="Resettable search" />
        <SearchInput label="Initial search" defaultValue="ETH" onValueChange={setResetQuery} />
        <SearchInput label="Controlled reset search" value={query()} onValueChange={setQuery} />
        <Button type="reset">Reset searches</Button>
      </form>
      <p data-reset-query>{resetQuery()}</p>
      <output>Query: {query()}; input events: {nativeInputs()}</output>
    </Stack>
  </main>;
}
