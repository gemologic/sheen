# FileDropzone

`FileDropzone` is a file-intake control, not an upload client. The native file input and its visible `Choose files` label work before JavaScript and provide the keyboard, touch, camera-capture, and operating-system picker path. Drag and drop is an equivalent enhancement, never the only operation.

`accept`, `maxSize`, and `maxFiles` are validated for picker and dropped files rather than treated as browser hints. `validateFile` adds synchronous app policy. Accepted `File` objects go to `onFilesSelected`; rejected files go to `onFilesRejected` with a typed count, size, type, or custom reason. The input value is cleared after delivery so selecting the same file again is observable. A file selected before hydration is delivered on mount without replacing the native input.

The app owns every upload request, cancellation token, retry, progress update, item ID, and authorization decision. It passes serializable `items` with stable IDs and visible status labels, then handles `onRetry` and `onRemove`. FileDropzone keys the rendered list by ID, so replacing an item record to publish progress or failure retains its list node. Uploading rows use native progress; every state also has text and does not rely on color. Buttons include the filename in their accessible name.

Nested drag-enter/leave events are depth-counted. An eligible drag changes the target treatment and announces `Drop files here`; leaving or dropping clears that state. Disabled and read-only instances reject picker, drop, retry, and removal. Read-only items remain visible.

Proof: two focused SSR/configuration cases and six Chromium cases use the native picker, browser `DataTransfer`, and a real multipart HTTP endpoint. They cover type, size, and count validation; picker/drop equivalence; stable progress/error/retry nodes; removal; read-only behavior; delayed hydration with an early native file selection; axe; and long/status-safe responsive rendering. A live Chrome DevTools review reports a complete picker/list accessibility tree and Lighthouse accessibility 100. WebKit, large uploads, and manual assistive-technology qualification remain release-wide work.
