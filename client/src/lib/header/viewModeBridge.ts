import type { ViewMode } from '../types/workspace';

export type ViewModeControlVariant = 'desktop' | 'mobile';

interface ViewModeBridge {
  select(mode: ViewMode, variant?: ViewModeControlVariant): void;
}

declare global {
  interface Window {
    markdownViewerViewMode?: ViewModeBridge;
  }
}

export function dispatchViewModeSelect(mode: ViewMode, variant: ViewModeControlVariant = 'desktop'): void {
  window.markdownViewerViewMode?.select?.(mode, variant);
}
