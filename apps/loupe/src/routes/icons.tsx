import { Button, Dialog, ThemeScope, useTheme } from "@gemologic/sheen";
import { DynamicIcon, Icon } from "@gemologic/sheen-icons";
import { SearchIcon } from "@gemologic/sheen-icons/icons/search";

function RootControls() {
  const theme = useTheme();
  return <div class="actions">
    <Button id="use-vellum" onClick={() => void theme.setTheme("vellum")}><Icon name="edit" size="sm" tone="inherit" />Use Vellum</Button>
    <Button id="use-obsidian" onClick={() => void theme.setTheme("obsidian")}><Icon name="refresh" size="sm" tone="inherit" />Use Obsidian</Button>
  </div>;
}

export default function IconPreview() {
  return <main class="loupe-icon-page">
    <h1>Semantic icons</h1>
    <p>Literal, per-icon, and explicitly dynamic paths share theme-selected artwork.</p>
    <RootControls />
    <section class="loupe-icon-specimens" aria-label="Root icon specimens">
      <div><Icon id="root-literal-icon" name="search" decorative={false} label="Literal search" size="sm" /><span>Literal marker</span></div>
      <div><SearchIcon id="root-static-icon" size="md" /><span>Per-icon export</span></div>
      <div><DynamicIcon id="root-dynamic-icon" name="settings" size="lg" /><span>Dynamic registry</span></div>
    </section>
    <ThemeScope theme="vellum" class="loupe-icon-scope">
      <h2>Vellum scope</h2>
      <Icon id="scope-icon" name="search" decorative={false} label="Scoped search" />
      <Dialog title="Scoped icon dialog" trigger="Open scoped icon dialog">
        <Icon id="scope-dialog-icon" name="info" decorative={false} label="Scoped dialog information" />
      </Dialog>
    </ThemeScope>
  </main>;
}
