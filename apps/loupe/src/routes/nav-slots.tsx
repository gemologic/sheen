import { createSignal } from "solid-js";
import { Button, NavItem, NavList, ThemeScope } from "@gemologic/sheen";

export default function NavSlotsFixture() {
  const [count, setCount] = createSignal(3);
  const refresh = async () => {
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
    if (response.ok) setCount(4);
  };
  return <main><h1>Navigation slots</h1>
    <Button onClick={refresh}>Refresh unread count</Button>
    <ThemeScope direction="rtl"><NavList label="Inbox navigation">
      <NavItem href="#inbox" label="Inbox" current icon={<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12v8H2z" fill="none" stroke="currentColor" /></svg>} badge={<span>{count()} unread</span>} />
      <NavItem href="#archive" label="Archive" />
    </NavList></ThemeScope>
  </main>;
}
