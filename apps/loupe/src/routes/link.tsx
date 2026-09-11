import { createSignal } from "solid-js";
import { Button, Link } from "@gemologic/sheen";

export default function LinkFixture() {
  const [count, setCount] = createSignal(0);
  const [button, setButton] = createSignal(false);
  const [alternate, setAlternate] = createSignal(false);
  return <main>
    <Button onClick={() => setCount(value => value + 1)}>Ready action</Button>
    <Link href={alternate() ? "/link#alternate" : "/link#destination"} variant={button() ? "button" : "text"}>Destination</Link>
    <Link href="/link#new-tab" target="_blank" rel="noopener" variant="button">New tab destination</Link>
    <Link href="/sheen-report.txt" download="sheen-report.txt" variant="button">Download report</Link>
    <Link href="/link#cancelled" onClick={event => { event.preventDefault(); setCount(value => value + 1); }}>Intercepted destination</Link>
    <Button onClick={() => setButton(value => !value)}>Toggle link appearance</Button>
    <Button onClick={() => setAlternate(value => !value)}>Toggle link destination</Button>
    <output aria-label="Link fixture count">{count()}</output>
    <section id="destination" tabindex="-1">Destination content</section>
    <section id="alternate" tabindex="-1">Alternate content</section>
  </main>;
}
