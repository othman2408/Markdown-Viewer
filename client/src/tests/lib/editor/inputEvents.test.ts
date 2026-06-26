// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  getEditorInputType,
  handleEditorInputEvent,
  handleTabIndent,
  type EditorInputHandlers
} from '../../../lib/editor/inputEvents';

function createHandlers(): EditorInputHandlers {
  return {
    debouncedRender: vi.fn(),
    handleKeystrokeHistory: vi.fn(),
    scheduleCurrentTabSave: vi.fn(),
    scheduleFindRefresh: vi.fn(),
    scheduleLineNumberUpdate: vi.fn(),
    updateFindHighlights: vi.fn()
  };
}

describe('editor input events', () => {
  it('normalizes input event types', () => {
    expect(getEditorInputType({ inputType: 'insertText' })).toBe('insertText');
    expect(getEditorInputType({})).toBe('');
    expect(getEditorInputType(null)).toBe('');
  });

  it('runs the input side-effect pipeline with find refresh while find is open', () => {
    const handlers = createHandlers();
    const event = { inputType: 'insertText' };

    handleEditorInputEvent(event, { isFindModalOpen: true }, handlers);

    expect(handlers.handleKeystrokeHistory).toHaveBeenCalledWith(event);
    expect(handlers.debouncedRender).toHaveBeenCalledOnce();
    expect(handlers.scheduleCurrentTabSave).toHaveBeenCalledOnce();
    expect(handlers.scheduleFindRefresh).toHaveBeenCalledOnce();
    expect(handlers.updateFindHighlights).not.toHaveBeenCalled();
    expect(handlers.scheduleLineNumberUpdate).toHaveBeenCalledWith({ inputType: 'insertText' });
  });

  it('updates find highlights directly when find is closed', () => {
    const handlers = createHandlers();

    handleEditorInputEvent({}, { isFindModalOpen: false }, handlers);

    expect(handlers.scheduleFindRefresh).not.toHaveBeenCalled();
    expect(handlers.updateFindHighlights).toHaveBeenCalledOnce();
    expect(handlers.scheduleLineNumberUpdate).toHaveBeenCalledWith({ inputType: '' });
  });

  it('handles Tab indentation and dispatches an input event', () => {
    const textarea = document.createElement('textarea');
    const dispatchEvent = vi.spyOn(textarea, 'dispatchEvent');
    textarea.value = 'abef';
    textarea.selectionStart = 2;
    textarea.selectionEnd = 2;
    const event = {
      key: 'Tab',
      preventDefault: vi.fn()
    };

    expect(handleTabIndent(event, textarea)).toBe(true);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(textarea.value).toBe('ab  ef');
    expect(textarea.selectionStart).toBe(4);
    expect(textarea.selectionEnd).toBe(4);
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'input' }));
  });

  it('ignores non-Tab keydown events', () => {
    const textarea = document.createElement('textarea');
    textarea.value = 'abc';
    const event = {
      key: 'Enter',
      preventDefault: vi.fn()
    };

    expect(handleTabIndent(event, textarea)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(textarea.value).toBe('abc');
  });
});
