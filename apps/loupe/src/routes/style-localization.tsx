import { Input, ThemeScope } from "@gemologic/sheen";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import { createSignal } from "solid-js";

interface Account { readonly id: string; readonly name: string; readonly amount: number }

const rows: readonly Account[] = Array.from({ length: 25 }, (_, index) => ({ id: `konto-${index}`, name: `Internationale Forschungsabteilung ${index + 1}`, amount: 1250 + index }));
const columns = defineColumns<Account>([
  { id: "name", header: "Kontobezeichnung", accessor: row => row.name, width: "fill", search: true, sort: "text" },
  { id: "amount", header: "Verwaltetes Guthaben", accessor: row => row.amount, numeric: true, width: 160, sort: "number" },
]);

/** Long translated labels exercise the same provider messages used by consuming applications. */
export default function StyleLocalizationFixture() {
  const [selection, setSelection] = createSignal("Keine Auswahl");
  return <ThemeScope theme="studio" locale="de-DE" messages={{
    nextPage: "Nächste Seite", previousPage: "Vorherige Seite", firstPage: "Erste Seite", lastPage: "Letzte Seite",
    pageLabel: "Seite {page}", pageStatus: "Seite {page} von {pages}", pagination: "Seitennavigation",
    searchTable: "{caption} durchsuchen", selectRow: "Zeile {id} auswählen", selectPage: "Diese Seite auswählen",
    selectedCount: "{count} ausgewählt", clearSelection: "Auswahl aufheben", selectionActions: "Auswahlaktionen",
    cardView: "{caption}, Kartenansicht", columns: "Spalten", sortColumn: "Nach {column} sortieren",
    moreActions: "Weitere Aktionen", sort: "Sortierung", resultCountOne: "{count} Ergebnis", resultCount: "{count} Ergebnisse",
  }}>
    <main class="loupe-data-table-page">
      <h1>Kontenübersicht</h1>
      <Input label="Vollständiger Name der verantwortlichen Organisation" description="Dieser Name wird in Berichten und Benachrichtigungen angezeigt." name="organization" />
      <output aria-label="Auswahl">{selection()}</output>
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Organisationskonten"
        pagination={{ pageIndex: 0, pageSize: 10 }} initialViewportHeight={420}
        mobileLayout={{ pageSize: 10, titleColumn: "name" }} selection={{ mode: "multiple", onChange: value => setSelection(JSON.stringify(value)) }} export={false} />
    </main>
  </ThemeScope>;
}
