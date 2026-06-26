import type { MarkdownFormatAction } from '../types/editor';

interface MarkdownToolbarBridge {
  runMarkdownTool?: (action: MarkdownFormatAction, button: HTMLElement) => void;
  toggleContentDirection?: () => void;
}

declare global {
  interface Window {
    markdownViewerToolbar?: MarkdownToolbarBridge;
  }
}

export function dispatchMarkdownToolbarAction(action: MarkdownFormatAction, button: HTMLElement): void {
  window.markdownViewerToolbar?.runMarkdownTool?.(action, button);
}

export function dispatchDirectionToggle(): void {
  window.markdownViewerToolbar?.toggleContentDirection?.();
}
