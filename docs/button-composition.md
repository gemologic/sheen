# Button composition

The public `buttonVariants` recipe is shared by Button, button-styled Link, and Dialog's built-in trigger. It is a small sheen-owned function that supplies independent `variant`, `tone`, and `size` classes. Defaults remain ghost, neutral, and medium. Consumers of the recipe import sheen's styles.css; they do not need Tailwind to scan the recipe or reproduce private data attributes to get its appearance.

```ts
import { buttonVariants, cn } from "@gemologic/sheen";
const classes = cn(buttonVariants({ variant: "outline", size: "sm" }), "custom");
```

Use the components for normal application controls. The class recipe is for wrapper/pattern composition and supplies no loading suppression, keyboard handling, or semantics. Button retains native button behavior, Link retains native anchor behavior, and component state remains exposed through data attributes. CSS interaction selectors still handle focus, hover, active, and disabled states. Component rules live in a named cascade layer below consumer utilities, so caller utilities override them without shipping a runtime Tailwind parser. `cn` only flattens conditional class values; it deliberately does not guess which pair of caller utilities conflicts. Consumers that need utility-to-utility conflict resolution should apply their own build-system convention before passing `class`.

`SheenPolymorphicProps` is a type-only re-export of Kobalte's PolymorphicProps under the sheen namespace, centralized in utils/polymorphic.ts. It accepts the upstream component and custom-prop type parameters. This is the explicitly accepted type dependency, not a guarantee of immunity to upstream type changes. It adds no runtime import and does not make Button or Link polymorphic. Those native semantics remain intentional.

Four targeted unit/SSR tests pass. A consumer fixture typechecks against the built declaration entry, with negative cases for button href and unknown variants. UI build, lint/typechecks, and manifest validation pass (76 components / 79 examples). The final native Chromium run passes 28 executions across composition, ButtonGroup, IconButton, and Link. It verifies equivalent computed appearance without private attributes, utility overrides, and Dialog trigger outline/focus restoration, alongside existing native activation and hydration checks.

This is not an isolated published-package consumer build or a complete visual/contrast/bundle audit. Those gates and shortcut association remain unfinished; the grouped button-family TODO stays open.
