import { createSignal } from "solid-js";
import { Button, Input, Table, TableCaption, TableHead, TableBody, TableFoot, TableRow, TableHeaderCell, TableCell, ThemeScope } from "@gemologic/sheen";

export default function TableFixture() {
  const [rtl, setRtl] = createSignal(false);
  const [compact, setCompact] = createSignal(false);
  return <main>
    <h1>Styled table</h1>
    <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
    <Button onClick={() => setCompact(value => !value)}>Toggle density</Button>
    <ThemeScope direction={rtl() ? "rtl" : "ltr"} density={compact() ? "compact" : "comfortable"}>
      <Table striped>
        <TableCaption>Orders</TableCaption>
        <TableHead><TableRow><TableHeaderCell>Symbol</TableHeaderCell><TableHeaderCell numeric>Quantity</TableHeaderCell><TableHeaderCell>Notes</TableHeaderCell></TableRow></TableHead>
        <TableBody>
          <TableRow><TableHeaderCell scope="row">BTC</TableHeaderCell><TableCell numeric>1.25</TableCell><TableCell><Input label="BTC notes" /></TableCell></TableRow>
          <TableRow><TableHeaderCell scope="row">ETH</TableHeaderCell><TableCell numeric>20.00</TableCell><TableCell><Input label="ETH notes" /></TableCell></TableRow>
          <TableRow hidden><TableCell colSpan={3}>Hidden order</TableCell></TableRow>
        </TableBody>
        <TableFoot><TableRow><TableCell colSpan={3}>Two orders</TableCell></TableRow></TableFoot>
      </Table>
    </ThemeScope>
  </main>;
}
