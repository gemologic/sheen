import { Card, Grid, Heading, Link, Stack, Text } from "@gemologic/sheen";

const dashboardStates: readonly { readonly href: string; readonly label: string }[] = [
  { href: "/gallery/dashboard", label: "Ready dashboard" },
  { href: "/gallery/dashboard?state=empty", label: "Empty dashboard" },
  { href: "/gallery/dashboard?state=loading", label: "Loading dashboard" },
  { href: "/gallery/dashboard?state=error", label: "Failed dashboard" },
  { href: "/gallery/dashboard?state=permission", label: "Permission-denied dashboard" },
];

const tableStates: readonly { readonly href: string; readonly label: string }[] = [
  { href: "/data-table-page?rows=100000", label: "100k continuous table" },
  { href: "/data-table-page?rows=100000&table=paged", label: "100k paginated table" },
  { href: "/data-table-page?rows=empty", label: "Empty table" },
  { href: "/data-table-page?page=cold", label: "Cold-loading table" },
  { href: "/data-table-page?page=server-error", label: "Failed table" },
  { href: "/data-table-page?page=permission-denied", label: "Permission-denied table" },
];

const compositionStates: readonly { readonly href: string; readonly label: string }[] = [
  { href: "/auth/focused", label: "Focused OAuth and OIDC sign-in" },
  { href: "/auth/brand-split", label: "Brand-split sign-in" },
  { href: "/gallery/list-detail", label: "List and detail" },
  { href: "/gallery/settings", label: "Multi-section settings" },
  { href: "/gallery/form", label: "Form-heavy workflow" },
  { href: "/gallery/reading", label: "Long-form notebook" },
  { href: "/gallery/hostile", label: "Hostile content pressure" },
  { href: "/gallery/admin-controls", label: "Account, workspace, and notifications" },
];

export default function GalleryIndex() {
  return <main class="loupe-gallery-index">
    <div><Heading level={1}>Layout gallery</Heading><Text tone="muted">Full-page compositions and explicit operational states, suitable for the laboratory iframe.</Text></div>
    <Grid columns={2} gap="lg" class="loupe-gallery-index-grid">
      <Card><Stack><Heading level={2} size="h3">Dashboard</Heading>{dashboardStates.map(item => <Link href={item.href}>{item.label}</Link>)}</Stack></Card>
      <Card><Stack><Heading level={2} size="h3">Data table</Heading>{tableStates.map(item => <Link href={item.href}>{item.label}</Link>)}</Stack></Card>
      <Card><Stack><Heading level={2} size="h3">Application shapes</Heading>{compositionStates.map(item => <Link href={item.href}>{item.label}</Link>)}</Stack></Card>
    </Grid>
  </main>;
}
