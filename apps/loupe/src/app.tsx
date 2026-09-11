import { Router, useLocation } from "@solidjs/router";
import { MetaProvider, Title } from "@solidjs/meta";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense } from "solid-js";
import type { ParentProps } from "solid-js";
import { ThemeProvider } from "@gemologic/sheen";
import "./app.css";
import { getThemeBootstrap } from "./theme-bootstrap";
import { hasWorkbenchHeader, WorkbenchHeader } from "./WorkbenchHeader.tsx";
import type { ThemeState } from "@gemologic/sheen";

function WorkbenchFrame(props: ParentProps) {
  const location = useLocation();
  return <>
    <Show when={hasWorkbenchHeader(location.pathname)}><WorkbenchHeader pathname={location.pathname} /></Show>
    <Suspense>{props.children}</Suspense>
  </>;
}

export default function App() {
  const bootstrap = getThemeBootstrap();
  async function persist(state: ThemeState): Promise<void> {
    const response = await fetch("/api/theme", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
    if (!response.ok) throw new Error(`Theme persistence failed (${response.status})`);
  }
  return <Router root={props => <MetaProvider><Title>Loupe · Sheen</Title><ThemeProvider hydration={bootstrap.hydration} initialState={bootstrap.state} persist={persist}><WorkbenchFrame>{props.children}</WorkbenchFrame></ThemeProvider></MetaProvider>}><FileRoutes /></Router>;
}
