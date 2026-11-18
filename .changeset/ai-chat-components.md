---
"@gemologic/sheen": minor
---

Add chat components in the new `@gemologic/sheen/ai` entry (also re-exported from the root) with a matching `@gemologic/sheen/styles/ai.css` island, included in `styles.css`. `PromptInput` is an auto-growing composer: Enter submits, Shift+Enter adds a newline, IME confirmation never submits, and its send button becomes a focus-retaining stop button while `status="streaming"`. `Conversation` is a keyed `role="log"` that keeps existing message nodes across appends and follows new content only while the reader is at the end. `Message` renders one turn with author, avatar, time, and actions. `StreamingText` grows plain text without recreating rendered paragraphs and announces completion once. New English messages: `promptInput`, `sendMessage`, `stopResponse`, `conversation`, `jumpToLatest`, `responseComplete`.
