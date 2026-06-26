export type ThemeToggleVariant = 'desktop' | 'mobile';

interface ThemeBridge {
  toggle(variant?: ThemeToggleVariant): void;
}

declare global {
  interface Window {
    markdownViewerTheme?: ThemeBridge;
  }
}

export function dispatchThemeToggle(variant: ThemeToggleVariant = 'desktop'): void {
  window.markdownViewerTheme?.toggle?.(variant);
}
