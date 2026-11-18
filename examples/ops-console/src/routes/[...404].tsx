import { EmptyState, Link } from "@gemologic/sheen";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
  return <div class="ops-page">
    <HttpStatusCode code={404} />
    <EmptyState heading="Page not found" description="Choose a destination from the console navigation."><Link href="/">Go to overview</Link></EmptyState>
  </div>;
}
