import { Button, Card, Text } from "@gemologic/sheen";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { createMemo } from "solid-js";
import { createComposerFixtures } from "../composer/fixtures.ts";
import SelfContainedAdmin from "../generated/composer-self-contained.tsx";
import StructureOnlyAdmin from "../generated/composer-structure-only.tsx";

const fixtures = createComposerFixtures("northstar-v1");

export default function ComposerGeneratedRoute() {
  const router = useSolidRouterAdapter();
  const structureOnly = createMemo(() => new URLSearchParams(router.location().search).get("mode") === "structure-only");
  return structureOnly()
    ? <StructureOnlyAdmin records={fixtures.records} activity={fixtures.activity} chartData={fixtures.chart.data}
      pageHeaderActions={<Button>Injected action</Button>} toolbarExtras={<Text>Injected toolbar slot</Text>}
      mainExtras={<Card><Text>Injected main slot</Text></Card>} detailsExtras={<Text>Injected details slot</Text>}
      statusExtras={<Text size="caption">Injected status slot</Text>} />
    : <SelfContainedAdmin />;
}
