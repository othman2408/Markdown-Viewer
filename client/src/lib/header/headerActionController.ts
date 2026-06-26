import type {
  HeaderAction,
  HeaderActionVariant,
  HeaderActionsBridge
} from './headerActionBridge';

export interface HeaderActionHandlers {
  copyMarkdown(event?: Event): void;
  exportHtml(event?: Event): void;
  exportMarkdown(event?: Event): void;
  exportPdf(event?: Event): void | Promise<void>;
  exportPng(event?: Event): void | Promise<void>;
  importFile(event?: Event): void;
  importGithub(event?: Event, variant?: HeaderActionVariant): void;
  share(event?: Event): void;
}

export function createHeaderActionController(
  handlers: HeaderActionHandlers
): HeaderActionsBridge {
  return {
    run(action, variant = 'desktop', event) {
      switch (action as HeaderAction) {
        case 'copyMarkdown':
          handlers.copyMarkdown(event);
          break;
        case 'exportHtml':
          handlers.exportHtml(event);
          break;
        case 'exportMarkdown':
          handlers.exportMarkdown(event);
          break;
        case 'exportPdf':
          void handlers.exportPdf(event);
          break;
        case 'exportPng':
          void handlers.exportPng(event);
          break;
        case 'importFile':
          handlers.importFile(event);
          break;
        case 'importGithub':
          handlers.importGithub(event, variant);
          break;
        case 'share':
          handlers.share(event);
          break;
      }
    }
  };
}
