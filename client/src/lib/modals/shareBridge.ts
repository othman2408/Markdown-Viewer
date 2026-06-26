import type { ShareMode } from '../state/modals.svelte';

interface ShareModalBridge {
  selectMode(mode: ShareMode): void;
}

declare global {
  interface Window {
    markdownViewerShare?: ShareModalBridge;
  }
}

export function dispatchShareModeSelection(mode: ShareMode): void {
  window.markdownViewerShare?.selectMode?.(mode);
}
