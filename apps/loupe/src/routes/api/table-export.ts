import { createClientExport, createClientView, deserializeState } from "@gemologic/sheen-table";
import { exportSchema } from "../../fixtures/table-export";

/** Bounded real export transport; the fixture exposes whole-view exports only. */
export async function GET(event: { request: Request }): Promise<Response> {
  const parameters = new URL(event.request.url).searchParams;
  const format = parameters.get("format");
  if (format !== "csv" && format !== "json") return new Response("Invalid format", { status: 400 });
  let state;
  try { state = deserializeState(parameters.get("state") ?? "", exportSchema); }
  catch { return new Response("Invalid table state", { status: 400 }); }
  await new Promise<void>(resolve => setTimeout(resolve, 600));
  if (parameters.get("reject") === "true") return new Response("Export service unavailable", { status: 503 });
  const rows = [{ name: "Alpha" }, { name: "Alpha second" }, { name: "Beta" }];
  const view = createClientView(rows, state, { locale: "en-US", searchColumns: ["name"], filterColumns: exportSchema.filterColumns, sortColumns: exportSchema.sortColumns, getValue: row => row.name });
  const column = state.columns[0];
  const exported = createClientExport(view.view, [{ id: "name", header: "Name", visible: column?.visible ?? false, value: row => row.name }]);
  return new Response(format === "csv" ? exported.toCSV() : exported.toJSON(), { headers: { "content-type": format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8", "cache-control": "no-store" } });
}
