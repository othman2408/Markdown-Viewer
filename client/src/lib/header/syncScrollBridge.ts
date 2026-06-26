export type SyncScrollControlVariant = 'desktop' | 'mobile';

interface SyncScrollBridge {
  toggle(variant?: SyncScrollControlVariant): void;
}

declare global {
  interface Window {
    markdownViewerSyncScroll?: SyncScrollBridge;
  }
}

export function dispatchSyncScrollToggle(variant: SyncScrollControlVariant = 'desktop'): void {
  window.markdownViewerSyncScroll?.toggle?.(variant);
}
