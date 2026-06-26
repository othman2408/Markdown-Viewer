export type HeaderAction =
  | 'copyMarkdown'
  | 'exportHtml'
  | 'exportMarkdown'
  | 'exportPdf'
  | 'exportPng'
  | 'files'
  | 'importFile'
  | 'importGithub'
  | 'share';
export type HeaderActionVariant = 'desktop' | 'mobile';

export interface HeaderActionsBridge {
  run(action: HeaderAction, variant?: HeaderActionVariant, event?: Event): void;
}

declare global {
  interface Window {
    markdownViewerHeaderActions?: HeaderActionsBridge;
  }
}

export function dispatchHeaderAction(
  action: HeaderAction,
  variant: HeaderActionVariant = 'desktop',
  event?: Event
): void {
  window.markdownViewerHeaderActions?.run?.(action, variant, event);
}
