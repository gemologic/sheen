import { For } from "solid-js";
import { Button, DescriptionList, DescriptionTerm, DescriptionDetails, EmptyState, Input, Row, Skeleton, Spinner, Stack, Surface, Table, TableBody, TableCaption, TableCell, TableFoot, TableHead, TableHeaderCell, TableRow, ThemeScope } from "@gemologic/sheen";
import type { ThemeScopeProps } from "@gemologic/sheen";

const configurations: Array<ThemeScopeProps & { name: string }> = [
  { name: "dark", theme: "obsidian", mode: "dark", density: "comfortable" },
  { name: "light", theme: "paper", mode: "light", density: "comfortable" },
  { name: "compact", theme: "obsidian", mode: "light", density: "compact" },
  { name: "contrast", theme: "contrast", mode: "light", density: "spacious" },
  { name: "rtl", theme: "obsidian", mode: "dark", density: "comfortable", direction: "rtl" },
];

export default function DataDisplayVisualFixture() {
  return <main style={{ "block-size": "100%" }}>
    <h1>Data display qualification</h1>
    <For each={configurations}>{configuration => <ThemeScope {...configuration} motion="reduced">
      <Surface padding="lg" data-qualification={configuration.name}>
        <Stack>
          <h2>{configuration.name}</h2>
          <Row><Spinner size="sm" label="Loading small" /><Spinner label="Loading medium" /><Spinner size="lg" label="Loading large" /><Spinner decorative /></Row>
          <Row><Skeleton shape="circle" /><Skeleton shape="rectangle" style={{ "inline-size": "40%" }} /><Skeleton style={{ "inline-size": "30%" }} /></Row>
          <DescriptionList layout="columns"><DescriptionTerm>Owner</DescriptionTerm><DescriptionDetails>Trading desk</DescriptionDetails><DescriptionTerm>Orders</DescriptionTerm><DescriptionDetails numeric>2</DescriptionDetails></DescriptionList>
          <Table striped>
            <TableCaption>Open orders</TableCaption>
            <TableHead><TableRow><TableHeaderCell>Symbol</TableHeaderCell><TableHeaderCell numeric>Quantity</TableHeaderCell><TableHeaderCell>Notes</TableHeaderCell></TableRow></TableHead>
            <TableBody>
              <TableRow><TableHeaderCell scope="row">BTC</TableHeaderCell><TableCell numeric>1.25</TableCell><TableCell><Input label={`${configuration.name} BTC notes`} value="Review before close" /></TableCell></TableRow>
              <TableRow><TableHeaderCell scope="row">ETH</TableHeaderCell><TableCell numeric>20.00</TableCell><TableCell><Input label={`${configuration.name} ETH notes`} value="Pending review" /></TableCell></TableRow>
            </TableBody>
            <TableFoot><TableRow><TableCell colSpan={3}>Two open orders</TableCell></TableRow></TableFoot>
          </Table>
          <EmptyState heading="No archived orders" description="Archived orders will appear here." />
          <EmptyState kind="no-results" description="Try another symbol."><Button data-final-action>Clear filters</Button></EmptyState>
        </Stack>
      </Surface>
    </ThemeScope>}</For>
  </main>;
}
