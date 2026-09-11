/** Install after Solid's hydration bootstrap, before any interactive markup. */
export function createKeyboardHydrationScript(): string {
  return `(()=>{document.addEventListener("keydown",event=>{const target=event.target;if(!(target instanceof Element)||!target.matches("[data-sheen-select-trigger],[data-sheen-menu-trigger]")||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;if(!["ArrowDown","ArrowUp","ArrowLeft","ArrowRight"].includes(event.key)&&event.key.length!==1)return;if(event.key===" ")return;const hydration=window._$HY;if(!hydration?.events||hydration.completed.has(target)||!target.hasAttribute("data-hk"))return;event.preventDefault();hydration.events.push([target,event]);});})();`;
}
