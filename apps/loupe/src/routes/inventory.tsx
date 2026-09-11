import { Avatar, AvatarGroup, Button, Meter, Progress, Stack, ThemeScope } from "@gemologic/sheen";
import { createSignal } from "solid-js";

const reviewers = Array.from({ length: 1002 }, (_, index) => ({ id: `reviewer-${index}`, label: `Reviewer ${index}` }));

export default function InventoryFixture() {
  const [source, setSource] = createSignal("/api/avatar-image?fail=true");
  const [value, setValue] = createSignal(4);
  return <main>
    <h1>Avatar and progress qualification</h1>
    <Stack>
      <Avatar data-avatar-refresh label="Ada Lovelace" src={source()} />
      <Button onClick={() => setSource(`/api/avatar-image?revision=${Date.now()}`)}>Load avatar image</Button>
      <ThemeScope locale="de-DE" messages={{ avatarOverflow: "{count} weitere" }}>
        <AvatarGroup label="Prüfer" max={1} avatars={reviewers} />
      </ThemeScope>
      <Progress data-inventory-progress label="Upload progress" value={value()} max={10} />
      <Progress label="Queued work" />
      <Meter data-inventory-meter label="Storage used" value={7} min={0} max={10} low={4} high={8} optimum={2} />
      <Button onClick={() => setValue(7)}>Advance upload</Button>
    </Stack>
  </main>;
}
