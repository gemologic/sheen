import { onCleanup, onMount } from "solid-js";

/**
 * Sizes a textarea's block size to its content once per animation frame while `enabled` is true.
 * Width changes, font loads, and form resets reschedule measurement; the returned function schedules it explicitly.
 * Disabling restores the inline block size the element had before resizing took ownership.
 */
export function createAutoResize(element: () => HTMLTextAreaElement | undefined, enabled: () => boolean): () => void {
  let mounted = false;
  let frame: number | undefined;
  let ownedSize = false;
  let originalSize = "";
  const measure = () => {
    frame = undefined;
    const textarea = element();
    if (!textarea || !mounted) return;
    if (!enabled()) {
      if (ownedSize) textarea.style.blockSize = originalSize;
      ownedSize = false;
      return;
    }
    if (!textarea.getClientRects().length) return;
    if (!ownedSize) originalSize = textarea.style.blockSize;
    ownedSize = true;
    textarea.style.blockSize = "auto";
    textarea.style.blockSize = `${textarea.scrollHeight + textarea.offsetHeight - textarea.clientHeight}px`;
  };
  const schedule = () => {
    const textarea = element();
    if (!mounted || !textarea || frame !== undefined) return;
    frame = textarea.ownerDocument.defaultView?.requestAnimationFrame(measure);
  };
  onMount(() => {
    const textarea = element();
    if (!textarea) return;
    mounted = true;
    let width = -1;
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      if (next !== undefined && next !== width) { width = next; schedule(); }
    });
    observer.observe(textarea);
    const fonts = textarea.ownerDocument.fonts;
    void fonts.ready.then(schedule);
    fonts.addEventListener("loadingdone", schedule);
    const reset = (event: Event) => { if (event.target === textarea.form) schedule(); };
    textarea.ownerDocument.addEventListener("reset", reset, true);
    schedule();
    onCleanup(() => {
      mounted = false;
      observer.disconnect();
      fonts.removeEventListener("loadingdone", schedule);
      textarea.ownerDocument.removeEventListener("reset", reset, true);
      if (frame !== undefined) textarea.ownerDocument.defaultView?.cancelAnimationFrame(frame);
    });
  });
  return schedule;
}
