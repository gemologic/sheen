# PageHeader

`PageHeader` is exported from `@gemologic/sheen-patterns` and uses that package's stylesheet. Supply a nonempty `title`, an optional semantic `headingLevel` (default 1), and optional `breadcrumb`, `actions`, and `tabs` slots. The title supplies the accessible group name. The component creates no additional banner landmark, so it can live inside AppShell's header.

The title/action row has a 44px minimum block size. Breadcrumb and tabs occupy additional rows. Large text, long titles, and wrapped actions can increase height; 44px is not a clipping boundary. Actions use logical alignment and wrap at narrow widths. Native hidden state is respected. Typography, gaps, and borders use sheen tokens.

Slot controls stay mounted through ordinary title updates. Breadcrumb and tabs retain their own navigation semantics. PageHeader does not observe a router or write document.title; those remain shell/router responsibilities. Apps must supply appropriate localized title and action text.

Qualification includes SSR heading/name semantics, one-time slot evaluation, omitted slots, blank-title rejection, action focus/draft and tab selection retention, RTL/mobile wrapping, delayed hydration with a queued title update, and a reviewed dark/light RTL visual baseline. The ordinary keyboard case waits for an observable direction update before sending non-replayable arrow input, so it proves post-hydration navigation rather than racing lazy route hydration. Full contrast, cross-browser, and router/title integration remain separate requirements.

Metadata examples can now provide an explicit `imports` preamble for cross-package components. The checker deduplicates identical preambles and TypeScript validates imported symbols along with the JSX; `setup` remains function-local example initialization.
