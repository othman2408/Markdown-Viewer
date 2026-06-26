// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attachAppKeyboardShortcutController } from '../../../lib/editor/appKeyboardShortcuts';

function createKeyboardEvent(input: KeyboardEventInit & { key: string }): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...input
  });
}

function createHandlers() {
  return {
    closeFindReplaceModal: vi.fn(),
    openFindReplaceModal: vi.fn(),
    closeActiveOverlays: vi.fn(),
    closeTab: vi.fn(),
    copyMarkdown: vi.fn(),
    exportMarkdown: vi.fn(),
    newTab: vi.fn(),
    redo: vi.fn(),
    toggleSyncScrolling: vi.fn(),
    undo: vi.fn()
  };
}

describe('app keyboard shortcut controller', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="find-replace-input" />
      <input id="find-replace-with" />
      <textarea id="markdown-editor"></textarea>
    `;
  });

  it('routes find/replace shortcuts before global shortcuts', () => {
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const handlers = createHandlers();
    const calls: string[] = [];
    handlers.openFindReplaceModal.mockImplementation(() => calls.push('find'));
    handlers.exportMarkdown.mockImplementation(() => calls.push('global'));
    attachAppKeyboardShortcutController({
      editorElement: editor,
      findReplaceHandlers: handlers,
      getFindReplaceOpen: () => false,
      getViewMode: () => 'split',
      globalHandlers: handlers
    });

    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, key: 'f' }));
    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, key: 's' }));

    expect(handlers.openFindReplaceModal).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(document.getElementById('find-replace-input'));
    expect(handlers.exportMarkdown).toHaveBeenCalledOnce();
    expect(calls).toEqual(['find', 'global']);
  });

  it('keeps Escape behavior from both shortcut handlers', () => {
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const handlers = createHandlers();
    attachAppKeyboardShortcutController({
      editorElement: editor,
      findReplaceHandlers: handlers,
      getFindReplaceOpen: () => true,
      getViewMode: () => 'split',
      globalHandlers: handlers
    });

    document.dispatchEvent(createKeyboardEvent({ key: 'Escape' }));

    expect(handlers.closeFindReplaceModal).toHaveBeenCalledOnce();
    expect(handlers.closeActiveOverlays).toHaveBeenCalledOnce();
  });

  it('reads editor selection and view mode at keydown time', () => {
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const handlers = createHandlers();
    let viewMode = 'preview';
    attachAppKeyboardShortcutController({
      editorElement: editor,
      findReplaceHandlers: handlers,
      getFindReplaceOpen: () => false,
      getViewMode: () => viewMode,
      globalHandlers: handlers
    });

    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, key: 'c' }));
    expect(handlers.copyMarkdown).toHaveBeenCalledOnce();

    editor.value = 'abc';
    editor.setSelectionRange(0, 1);
    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, key: 'c' }));
    expect(handlers.copyMarkdown).toHaveBeenCalledOnce();

    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, shiftKey: true, key: 'S' }));
    expect(handlers.toggleSyncScrolling).not.toHaveBeenCalled();

    viewMode = 'split';
    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, shiftKey: true, key: 'S' }));
    expect(handlers.toggleSyncScrolling).toHaveBeenCalledOnce();
  });

  it('supports injected active element and document selection readers', () => {
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const input = document.createElement('input');
    const handlers = createHandlers();
    attachAppKeyboardShortcutController({
      editorElement: editor,
      findReplaceHandlers: handlers,
      getActiveElement: () => input,
      getFindReplaceOpen: () => false,
      getHasDocumentSelection: () => true,
      getViewMode: () => 'split',
      globalHandlers: handlers
    });

    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, key: 'c' }));

    expect(handlers.copyMarkdown).not.toHaveBeenCalled();
  });

  it('detaches the document keydown listener', () => {
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    const handlers = createHandlers();
    const controller = attachAppKeyboardShortcutController({
      editorElement: editor,
      findReplaceHandlers: handlers,
      getFindReplaceOpen: () => false,
      getViewMode: () => 'split',
      globalHandlers: handlers
    });

    controller.detach();
    document.dispatchEvent(createKeyboardEvent({ ctrlKey: true, key: 's' }));

    expect(handlers.exportMarkdown).not.toHaveBeenCalled();
  });
});
