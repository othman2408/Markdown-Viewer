// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  handleGlobalEditorShortcut,
  type GlobalShortcutContext,
  type GlobalShortcutEventLike,
  type GlobalShortcutHandlers
} from '../../../lib/editor/shortcuts';

function createEvent(input: Partial<GlobalShortcutEventLike>): GlobalShortcutEventLike {
  return {
    altKey: false,
    ctrlKey: false,
    key: '',
    metaKey: false,
    preventDefault: vi.fn(),
    shiftKey: false,
    ...input
  };
}

function createHandlers(): GlobalShortcutHandlers {
  return {
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

function createContext(input: Partial<GlobalShortcutContext> = {}): GlobalShortcutContext {
  const editorElement = document.createElement('textarea');
  return {
    activeElement: document.body,
    editorElement,
    editorHasSelection: false,
    hasDocumentSelection: false,
    viewMode: 'split',
    ...input
  };
}

describe('global editor shortcuts', () => {
  it('runs undo and redo only while the editor is active', () => {
    const handlers = createHandlers();
    const editorElement = document.createElement('textarea');
    const context = createContext({ activeElement: editorElement, editorElement });
    const undoEvent = createEvent({ ctrlKey: true, key: 'z' });
    const redoEvent = createEvent({ ctrlKey: true, shiftKey: true, key: 'Z' });

    expect(handleGlobalEditorShortcut(undoEvent, context, handlers)).toBe(true);
    expect(handleGlobalEditorShortcut(redoEvent, context, handlers)).toBe(true);

    expect(undoEvent.preventDefault).toHaveBeenCalledOnce();
    expect(redoEvent.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.undo).toHaveBeenCalledOnce();
    expect(handlers.redo).toHaveBeenCalledOnce();
    expect(handlers.exportMarkdown).not.toHaveBeenCalled();
  });

  it('exports markdown on command-s', () => {
    const handlers = createHandlers();
    const event = createEvent({ ctrlKey: true, key: 's' });

    expect(handleGlobalEditorShortcut(event, createContext(), handlers)).toBe(true);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.exportMarkdown).toHaveBeenCalledOnce();
  });

  it('copies markdown only when no text control or selection owns copy', () => {
    const handlers = createHandlers();
    const event = createEvent({ metaKey: true, key: 'c' });

    expect(handleGlobalEditorShortcut(event, createContext(), handlers)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.copyMarkdown).toHaveBeenCalledOnce();

    const textInputEvent = createEvent({ metaKey: true, key: 'c' });
    const input = document.createElement('input');
    handleGlobalEditorShortcut(textInputEvent, createContext({ activeElement: input }), handlers);

    expect(textInputEvent.preventDefault).not.toHaveBeenCalled();
    expect(handlers.copyMarkdown).toHaveBeenCalledOnce();
  });

  it('prevents sync shortcut outside split view without toggling', () => {
    const handlers = createHandlers();
    const event = createEvent({ ctrlKey: true, shiftKey: true, key: 'S' });

    expect(handleGlobalEditorShortcut(event, createContext({ viewMode: 'preview' }), handlers)).toBe(true);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(handlers.toggleSyncScrolling).not.toHaveBeenCalled();
  });

  it('routes tab shortcuts and Escape overlay close', () => {
    const handlers = createHandlers();
    const newTabEvent = createEvent({ altKey: true, shiftKey: true, key: 'T' });
    const closeTabEvent = createEvent({ altKey: true, shiftKey: true, key: 'W' });
    const escapeEvent = createEvent({ key: 'Escape' });

    handleGlobalEditorShortcut(newTabEvent, createContext(), handlers);
    handleGlobalEditorShortcut(closeTabEvent, createContext(), handlers);
    handleGlobalEditorShortcut(escapeEvent, createContext(), handlers);

    expect(newTabEvent.preventDefault).toHaveBeenCalledOnce();
    expect(closeTabEvent.preventDefault).toHaveBeenCalledOnce();
    expect(escapeEvent.preventDefault).not.toHaveBeenCalled();
    expect(handlers.newTab).toHaveBeenCalledOnce();
    expect(handlers.closeTab).toHaveBeenCalledOnce();
    expect(handlers.closeActiveOverlays).toHaveBeenCalledOnce();
  });
});
