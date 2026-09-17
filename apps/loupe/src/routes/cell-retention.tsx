import { Button, NumberText, ThemeScope } from "@gemologic/sheen";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import { createSignal } from "solid-js";

interface Row { readonly id: string; readonly name: string; readonly amount: number; readonly revision: number }

export default function CellRetentionFixture() {
  const [rows, setRows] = createSignal<readonly Row[]>([{ id: "one", name: "Alpha", amount: 1250.5, revision: 1 }]);
  const [selected, setSelected] = createSignal("");
  const [locale, setLocale] = createSignal("en-US");
  const columns = defineColumns<Row>([
    { id: "amount", header: "Amount", accessor: row => row.amount, cellDependencies: [], cell: value => <NumberText value={Number(value)} format={{ style: "currency", currency: "USD" }} /> },
    { id: "name", header: "Name", accessor: row => row.id, cellDependencies: ["name"], cell: (_value, row) => <Button onClick={() => setSelected(row.name)}>Choose {row.name}</Button> },
    { id: "revision", header: "Revision", accessor: row => row.id, cell: (_value, row) => <span>Revision {row.revision}</span> },
  ]);
  return <main>
    <h1>Retained custom cells</h1>
    <Button onClick={() => setRows(previous => previous.map(row => ({ ...row, revision: row.revision + 1 })))}>Refresh revision</Button>
    <Button onClick={() => setRows(previous => previous.map(row => ({ ...row, name: "Beta" })))}>Rename</Button>
    <Button onClick={() => setRows(previous => previous.map(row => ({ ...row, amount: 2000.75 })))}>Change amount</Button>
    <Button onClick={() => setLocale("de-DE")}>German locale</Button>
    <output aria-label="Chosen account">{selected()}</output>
    <ThemeScope locale={locale()}><DataTable caption="Retained records" columns={columns} data={rows()} getRowId={row => row.id} pagination={false} initialViewportHeight={180} search={false} filterBar={false} export={false} /></ThemeScope>
  </main>;
}
