# ButtonGroup

ButtonGroup groups related actions with a required accessible `label` and optional `orientation="horizontal" | "vertical"`. It renders an [ARIA group](https://www.w3.org/TR/wai-aria-1.2/#group), not a toolbar, toggle group, or form fieldset. Its token-spaced layout wraps horizontally and stacks vertically; it does not join button borders or override child variants.

Buttons retain their own names, disabled/loading states, and native keyboard behavior. The group adds no tab stop or arrow-key handling. Use Toolbar for the toolbar keyboard model and a selection control for mutually exclusive values. Changing orientation updates CSS without recreating children.

Two SSR tests and four native Chromium cases pass for required naming, native disabled ownership, Tab order, Space/Enter activation, retained nodes through layout changes, delayed hydration replay, and wrapping ordinary labels within a narrow container in LTR/RTL. The four browser cases also pass twice each. This does not qualify arbitrarily long unbroken labels. The UI build, lint/typechecks, and manifest validation pass at 74 components and 76 compiling examples. Reviewed visual matrices, hostile-content overflow, and other engines remain open. The grouped Button/IconButton/ButtonGroup/Link TODO is not complete.
