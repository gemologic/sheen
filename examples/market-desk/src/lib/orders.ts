export type Side = "Buy" | "Sell";
export type OrderType = "Market" | "Limit";

export interface OrderRequest {
  readonly clientId: string;
  readonly symbol: string;
  readonly side: Side;
  readonly type: OrderType;
  readonly quantity: number;
  readonly limitPrice: number | null;
}

export interface PlannedFill {
  readonly delayMs: number;
  readonly quantity: number;
  readonly price: number;
}

export type OrderResponse =
  | { readonly kind: "accepted"; readonly id: string; readonly clientId: string; readonly acceptedAt: number; readonly fills: readonly PlannedFill[] }
  | { readonly kind: "rejected"; readonly clientId: string; readonly reason: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseOrderRequest(value: unknown): OrderRequest {
  if (!record(value)) throw new Error("Invalid order");
  const { clientId, symbol, side, type, quantity, limitPrice } = value;
  if (typeof clientId !== "string" || typeof symbol !== "string" || (side !== "Buy" && side !== "Sell") || (type !== "Market" && type !== "Limit")
    || typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity <= 0 || (limitPrice !== null && (typeof limitPrice !== "number" || !Number.isFinite(limitPrice) || limitPrice <= 0))
    || (type === "Limit" && limitPrice === null)) throw new Error("Invalid order");
  return { clientId, symbol, side, type, quantity, limitPrice };
}

export function parseOrderResponse(value: unknown): OrderResponse {
  if (!record(value) || typeof value.clientId !== "string") throw new Error("Invalid order response");
  if (value.kind === "rejected" && typeof value.reason === "string") return { kind: "rejected", clientId: value.clientId, reason: value.reason };
  if (value.kind !== "accepted" || typeof value.id !== "string" || typeof value.acceptedAt !== "number" || !Array.isArray(value.fills)) throw new Error("Invalid order response");
  const fills = value.fills.map((fill: unknown): PlannedFill => {
    if (!record(fill) || typeof fill.delayMs !== "number" || typeof fill.quantity !== "number" || typeof fill.price !== "number") throw new Error("Invalid fill");
    return { delayMs: fill.delayMs, quantity: fill.quantity, price: fill.price };
  });
  return { kind: "accepted", id: value.id, clientId: value.clientId, acceptedAt: value.acceptedAt, fills };
}
