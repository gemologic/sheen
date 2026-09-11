# ErrorState

`ErrorState` is a regional presentation from `@gemologic/sheen-patterns`, not a data loader or error boundary. It supports `kind="not-found"`, `"server"` (default), and `"permission-denied"`, using scoped messages unless the app supplies a nonempty `title`. The heading names the region; `headingLevel` defaults to 2. The app supplies safe localized descriptions and any action children.

Without `onRetry`, there is no retry button. When supplied, the app callback owns its request, cache, and cancellation. ErrorState suppresses concurrent activation, disables the retry button while pending, and uses a pre-existing polite live region for progress or generic rejection feedback. It catches synchronous throws and rejected promises without rendering raw exception text. A line is reserved for short feedback to avoid shifting adjacent content. Longer localized feedback may wrap rather than clip.

Successful retry clears retry-failure feedback but does not dismiss the original error or replace content. The app must accept new data and decide when to remove the region. Owner disposal prevents pending completions from updating detached UI, but does not abort app-owned requests. Permission revocation must clear unauthorized content in the app; keeping an error visible is not authorization enforcement.

Keep authorized existing content mounted alongside failed-refresh notices. ErrorState does not wrap or replace that content, move focus, or restart a page. Native attributes, hidden state, and children remain available.

Qualification uses real SSR and a delayed HTTP endpoint, with rejection/success, keyboard duplicate suppression, disposal before rejection, safe feedback, retained drafts/DOM, delayed hydration replay, mobile overflow, and a reviewed dark/light RTL baseline. Assistive-technology announcement testing, full contrast matrices, and cross-browser qualification remain open. Layout-matched LoadingState and Toolbar are separate outstanding patterns.
