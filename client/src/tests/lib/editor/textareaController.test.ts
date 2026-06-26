// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachEditorTextareaController,
  type EditorTextareaScrollSnapshot
} from '../../../lib/editor/textareaController';
import type { EditorInputHandlers } from '../../../lib/editor/inputEvents';

function createInputHandlers(): EditorInputHandlers {
  return {
    debouncedRender: vi.fn(),
    handleKeystrokeHistory: vi.fn(),
    scheduleCurrentTabSave: vi.fn(),
    scheduleFindRefresh: vi.fn(),
    scheduleLineNumberUpdate: vi.fn(),
    updateFindHighlights: vi.fn()
  };
}

function createController(input: {
  editor?: HTMLTextAreaElement;
  findOpen?: boolean;
  handleListEnter?: (event: KeyboardEvent) => boolean;
  inputHandlers?: EditorInputHandlers;
  onScrollSnapshot?: (snapshot: EditorTextareaScrollSnapshot) => void;
  saveCurrentTabState?: () => void;
  scheduleEditorOverlayScrollSync?: () => void;
  syncEditorToPreview?: () => void;
  updateLastCursor?: (event: Event) => void;
} = {}) {
  const editor = input.editor ?? document.createElement('textarea');
  document.body.appendChild(editor);
  const inputHandlers = input.inputHandlers ?? createInputHandlers();
  const controller = attachEditorTextareaController({
    editorElement: editor,
    getFindModalOpen: () => Boolean(input.findOpen),
    handleListEnter: input.handleListEnter ?? (() => false),
    inputHandlers,
    onScrollSnapshot: input.onScrollSnapshot ?? (() => undefined),
    saveCurrentTabState: input.saveCurrentTabState ?? (() => undefined),
    scheduleEditorOverlayScrollSync: input.scheduleEditorOverlayScrollSync ?? (() => undefined),
    syncEditorToPreview: input.syncEditorToPreview ?? (() => undefined),
    updateLastCursor: input.updateLastCursor ?? (() => undefined)
  });

  return {
    controller,
    editor,
    inputHandlers
  };
}

describe('editor textarea controller', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('routes input events through the typed input helper with live find state', () => {
    const inputHandlers = createInputHandlers();
    const { editor } = createController({
      findOpen: true,
      inputHandlers
    });
    const event = new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText'
    });

    editor.dispatchEvent(event);

    expect(inputHandlers.handleKeystrokeHistory).toHaveBeenCalledWith(event);
    expect(inputHandlers.debouncedRender).toHaveBeenCalledOnce();
    expect(inputHandlers.scheduleCurrentTabSave).toHaveBeenCalledOnce();
    expect(inputHandlers.scheduleFindRefresh).toHaveBeenCalledOnce();
    expect(inputHandlers.updateFindHighlights).not.toHaveBeenCalled();
    expect(inputHandlers.scheduleLineNumberUpdate).toHaveBeenCalledWith({
      inputType: 'insertText'
    });
  });

  it('routes input events to highlight updates when find is closed', () => {
    const inputHandlers = createInputHandlers();
    const { editor } = createController({
      findOpen: false,
      inputHandlers
    });

    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(inputHandlers.scheduleFindRefresh).not.toHaveBeenCalled();
    expect(inputHandlers.updateFindHighlights).toHaveBeenCalledOnce();
  });

  it('saves the current tab on textarea change', () => {
    const saveCurrentTabState = vi.fn<() => void>();
    const { editor } = createController({ saveCurrentTabState });

    editor.dispatchEvent(new Event('change'));

    expect(saveCurrentTabState).toHaveBeenCalledOnce();
  });

  it('keeps cursor tracking before list continuation and Tab indentation', () => {
    const calls: string[] = [];
    const inputHandlers = createInputHandlers();
    const handleListEnter = vi.fn(() => {
      calls.push('list');
      return false;
    });
    const updateLastCursor = vi.fn(() => {
      calls.push('cursor');
    });
    const { editor } = createController({
      handleListEnter,
      inputHandlers,
      updateLastCursor
    });
    editor.value = 'abc';
    editor.setSelectionRange(1, 1);
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab'
    });

    editor.dispatchEvent(event);

    expect(calls).toEqual(['cursor', 'list']);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.value).toBe('a  bc');
    expect(editor.selectionStart).toBe(3);
    expect(inputHandlers.handleKeystrokeHistory).toHaveBeenCalledOnce();
  });

  it('skips Tab indentation when list continuation handles the keydown', () => {
    const inputHandlers = createInputHandlers();
    const { editor } = createController({
      handleListEnter: () => true,
      inputHandlers
    });
    editor.value = 'abc';
    editor.setSelectionRange(1, 1);

    editor.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab'
    }));

    expect(editor.value).toBe('abc');
    expect(inputHandlers.handleKeystrokeHistory).not.toHaveBeenCalled();
  });

  it('routes cursor and scroll events', () => {
    const onScrollSnapshot = vi.fn<(snapshot: EditorTextareaScrollSnapshot) => void>();
    const scheduleEditorOverlayScrollSync = vi.fn<() => void>();
    const syncEditorToPreview = vi.fn<() => void>();
    const updateLastCursor = vi.fn<(event: Event) => void>();
    const { editor } = createController({
      onScrollSnapshot,
      scheduleEditorOverlayScrollSync,
      syncEditorToPreview,
      updateLastCursor
    });

    editor.dispatchEvent(new Event('keyup'));
    editor.dispatchEvent(new Event('mousedown'));
    editor.dispatchEvent(new Event('mouseup'));
    editor.dispatchEvent(new Event('focus'));
    editor.scrollTop = 12;
    editor.scrollLeft = 4;
    editor.dispatchEvent(new Event('scroll'));

    expect(updateLastCursor).toHaveBeenCalledTimes(4);
    expect(onScrollSnapshot).toHaveBeenCalledWith({
      scrollLeft: 4,
      scrollTop: 12
    });
    expect(syncEditorToPreview).toHaveBeenCalledOnce();
    expect(scheduleEditorOverlayScrollSync).toHaveBeenCalledOnce();
  });

  it('detaches textarea listeners', () => {
    const inputHandlers = createInputHandlers();
    const saveCurrentTabState = vi.fn<() => void>();
    const { controller, editor } = createController({
      inputHandlers,
      saveCurrentTabState
    });

    controller.detach();
    editor.dispatchEvent(new Event('input'));
    editor.dispatchEvent(new Event('change'));

    expect(inputHandlers.handleKeystrokeHistory).not.toHaveBeenCalled();
    expect(saveCurrentTabState).not.toHaveBeenCalled();
  });
});
