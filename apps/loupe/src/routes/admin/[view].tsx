import { useParams } from "@solidjs/router";
import { AdminAppFixture } from "../../fixtures/admin-app.tsx";
export default function AdminStarterViewRoute() {
  const parameters = useParams<{ view: string }>();
  return <AdminAppFixture view={parameters.view} />;
}
