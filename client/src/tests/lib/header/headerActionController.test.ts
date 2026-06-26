// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createHeaderActionController, type HeaderActionHandlers } from '../../../lib/header/headerActionController';

function createHandlers(): HeaderActionHandlers {
  return {
    copyMarkdown: vi.fn(),
    exportHtml: vi.fn(),
    exportMarkdown: vi.fn(),
    exportPdf: vi.fn(async () => {}),
    exportPng: vi.fn(async () => {}),
    importFile: vi.fn(),
    importGithub: vi.fn(),
    share: vi.fn()
  };
}

describe('header action controller', () => {
  it('routes each header action to its handler', () => {
    const handlers = createHandlers();
    const event = new MouseEvent('click');
    const controller = createHeaderActionController(handlers);

    controller.run('copyMarkdown', 'desktop', event);
    controller.run('exportHtml', 'desktop', event);
    controller.run('exportMarkdown', 'desktop', event);
    controller.run('exportPdf', 'desktop', event);
    controller.run('exportPng', 'desktop', event);
    controller.run('importFile', 'desktop', event);
    controller.run('share', 'desktop', event);

    expect(handlers.copyMarkdown).toHaveBeenCalledWith(event);
    expect(handlers.exportHtml).toHaveBeenCalledWith(event);
    expect(handlers.exportMarkdown).toHaveBeenCalledWith(event);
    expect(handlers.exportPdf).toHaveBeenCalledWith(event);
    expect(handlers.exportPng).toHaveBeenCalledWith(event);
    expect(handlers.importFile).toHaveBeenCalledWith(event);
    expect(handlers.share).toHaveBeenCalledWith(event);
  });

  it('passes the action variant to GitHub import', () => {
    const handlers = createHandlers();
    const event = new MouseEvent('click');
    const controller = createHeaderActionController(handlers);

    controller.run('importGithub', 'mobile', event);

    expect(handlers.importGithub).toHaveBeenCalledWith(event, 'mobile');
  });

  it('ignores unknown runtime actions', () => {
    const handlers = createHandlers();
    const controller = createHeaderActionController(handlers);

    controller.run('missing-action' as never);

    expect(handlers.copyMarkdown).not.toHaveBeenCalled();
    expect(handlers.share).not.toHaveBeenCalled();
  });
});
