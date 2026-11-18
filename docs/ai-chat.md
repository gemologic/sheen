# Chat components

`@gemologic/sheen/ai` exports `PromptInput`, `Conversation`, `Message`, and `StreamingText`. The root entry re-exports them. Pages that import CSS islands add `@gemologic/sheen/styles/ai.css` after `styles/core.css`; the island contains only these components' rules and reuses core's Button.

## PromptInput

A native `form` containing one auto-growing textarea and one action button. The textarea starts at one row, grows with content up to `maxRows` (default 8), then scrolls. Measurement reuses Textarea's frame-batched autosize, so width, font, and theme changes remeasure without animating height.

Enter submits; Shift+Enter inserts a newline. Enter that confirms an IME candidate never submits: the handler rejects `isComposing`, `keyCode` 229 (Safari reports it after `compositionend`), and an open composition. Whitespace-only drafts never submit. `onSubmit` receives the untrimmed draft. Uncontrolled drafts clear after submit; a controlled owner clears `value` itself once it accepts the submission, so a failed send can keep the draft. Text typed before hydration is adopted and reported through `onValueChange` without replacing the server textarea.

`status="streaming"` turns the same button node into the stop action (`type="button"`, `onStop`) and holds Enter, while the draft stays editable. Unavailable send/stop states use `aria-disabled` rather than native `disabled`, so focus survives the send-to-stop-to-send cycle and the empty-draft state. `disabled` disables the textarea and action natively. `leading` and `trailing` are toolbar slots for actions such as attachments; pass Buttons, which default to `type="button"`.

## Conversation and Message

`Conversation` is a scrolling `role="log"` keyed by stable, unique, nonempty item IDs. Its render function receives a reactive item accessor, so replacing an item object for the same ID updates fields in place; appends, removals, and content updates never recreate surviving message nodes. Duplicate IDs throw. Give it a bounded block size.

Turns rendered on the server or during hydration do not animate. Turns appended after mount fade and rise by `--sheen-motion-distance-sm` with `--sheen-ease-spring`, staggered by `--sheen-motion-stagger` within one appended batch. Reduced motion zeroes those tokens.

While the reader is at the end, growth from appends, streaming text, or late media keeps the end in view (a ResizeObserver on the content, not per-token scrolling). Scrolling up by wheel, keyboard, or touch stops following and shows a "Jump to latest message" action; returning to the end by any means, or using the action, resumes following. Only upward movement unsticks, so content that grows between a programmatic scroll and its scroll event cannot unstick the thread. `stickToBottom={false}` disables following. The log is focusable so keyboard users can scroll it.

`Message` is an `article` with `from` (`user`, `assistant`, `system`), optional `author` (which also names the article), `avatar`, paired `timestamp`/`timeLabel`, content children, and an `actions` row kept in normal tab order. User turns align to the inline end in a raised bubble; system turns are centered muted notes.

## StreamingText

Pass the accumulated text, not individual tokens. Blank lines split paragraphs; other whitespace is preserved (`pre-wrap`). Paragraphs are position-keyed, so an append only rewrites the final paragraph's existing text node and earlier paragraphs are untouched. Content is plain text, never parsed as HTML or markdown.

While `streaming` is true the root is `aria-busy` and a CSS caret follows the last paragraph. The caret pulse derives from `--sheen-duration-slow` and stops under reduced motion. When `streaming` changes from true to false, a polite status region announces `responseComplete` once; streaming start clears it. Initial server state never announces.

## Coverage

SSR unit tests cover markup, labels, slots, and validation. The Chromium spec at `tests/browser/ai-chat.spec.ts` (route `/ai-chat`) covers Enter, Shift+Enter, trusted CDP IME composition, send/stop node and focus retention, the row cap, message node identity across appends, stick-to-bottom versus scrolled-up reading, per-frame paragraph/text-node retention while text grows, the completion announcement, and pre-hydration draft adoption. Screen-reader output itself and WebKit/Firefox behavior are not verified by these tests.
