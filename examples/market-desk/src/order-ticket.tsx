import { Button, Drawer, NumberField, SegmentedControl, Select, Stack, Text } from "@gemologic/sheen";
import { createEffect, createSignal, on } from "solid-js";
import type { Instrument, Quote } from "./lib/market.ts";
import type { OrderRequest, OrderType, Side } from "./lib/orders.ts";

export interface OrderTicketProps {
  readonly instrument: Instrument;
  readonly quote: Quote;
  readonly onSubmit: (request: Omit<OrderRequest, "clientId">) => void;
}

const sideOptions = [{ value: "Buy", label: "Buy" }, { value: "Sell", label: "Sell" }];
const typeOptions = [{ value: "Market", label: "Market" }, { value: "Limit", label: "Limit" }];

export function OrderTicket(props: OrderTicketProps) {
  const [open, setOpen] = createSignal(false);
  const [side, setSide] = createSignal<Side>("Buy");
  const [type, setType] = createSignal<OrderType>("Market");
  const [quantity, setQuantity] = createSignal<number | null>(100);
  const [limit, setLimit] = createSignal<number | null>(null);
  // Re-seed the limit from the live quote only when the instrument changes, never while the user is editing.
  createEffect(on(() => props.instrument.symbol, () => setLimit(null)));
  const reference = () => side() === "Buy" ? props.quote.ask : props.quote.bid;
  const limitError = () => type() === "Limit" && (limit() === null || (limit() ?? 0) <= 0) ? "Enter a limit price." : undefined;
  const quantityError = () => quantity() === null || (quantity() ?? 0) < 1 ? "Enter a quantity of at least 1." : undefined;

  function submit(): void {
    const amount = quantity();
    if (amount === null || quantityError() || limitError()) return;
    props.onSubmit({ symbol: props.instrument.symbol, side: side(), type: type(), quantity: amount, limitPrice: type() === "Limit" ? limit() : null });
    setOpen(false);
  }

  return <Drawer title={`New order · ${props.instrument.symbol}`} description="Orders are simulated; fills arrive as notifications." trigger="New order" side="end"
    open={open()} onOpenChange={next => { setOpen(next); if (next && limit() === null && Number.isFinite(reference())) setLimit(reference()); }}
    footer={<Button variant="solid" tone="accent" onClick={submit}>{side()} {props.instrument.symbol}</Button>}>
    <Stack gap="md">
      <SegmentedControl name="side" label="Side" fullWidth size="md" options={sideOptions} value={side()} onValueChange={value => { if (value === "Buy" || value === "Sell") setSide(value); }} />
      <Select label="Order type" options={typeOptions} value={type()} onValueChange={value => { if (value === "Market" || value === "Limit") setType(value); }} />
      <NumberField label="Quantity" value={quantity()} onValueChange={setQuantity} min={1} max={1_000_000} step={100} formatOptions={{ maximumFractionDigits: 0 }}
        {...(quantityError() ? { error: quantityError() ?? "" } : {})} />
      {type() === "Limit" ? <NumberField label="Limit price (USD)" value={limit()} onValueChange={setLimit} min={0} step={props.instrument.tick} largeStep={props.instrument.tick * 100}
        formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 3 }} {...(limitError() ? { error: limitError() ?? "" } : {})} /> : null}
      <Text tone="muted" size="caption">{Number.isFinite(reference()) ? `${side() === "Buy" ? "Ask" : "Bid"} ${reference().toFixed(2)} · Limits more than 10% from the market are rejected.` : `${props.instrument.symbol} is halted; new orders will be rejected.`}</Text>
    </Stack>
  </Drawer>;
}
