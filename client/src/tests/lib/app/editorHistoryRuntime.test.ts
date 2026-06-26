// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createEditorHistoryRuntime } from '../../../lib/app/editorHistoryRuntime';

describe('editor history runtime', () => {
  it('tracks programmatic edits and restores undo state', () => {
    const editor = document.createElement('textarea');
    editor.value = 'hello';
    document.body.appendChild(editor);
    const syncEditorState = vi.fn();
    const saveCurrentTabState = vi.fn();

    const runtime = createEditorHistoryRuntime({
      editor,
      getActiveTabId: () => 'tab-1',
      saveCurrentTabState,
      syncEditorState
    });

    runtime.activateTabHistory('tab-1', 'hello');
    runtime.pushProgrammaticHistoryState();
    editor.value = 'hello world';
    editor.setSelectionRange(11, 11);
    runtime.markProgrammaticInput(editor.value);
    runtime.executeUndo();

    expect(editor.value).toBe('hello');
    expect(saveCurrentTabState).toHaveBeenCalledOnce();
    expect(syncEditorState).toHaveBeenCalledWith(expect.objectContaining({
      canRedo: true,
      canUndo: false
    }));
  });

  it('commits pending keystroke history with the provided timer', () => {
    const editor = document.createElement('textarea');
    editor.value = 'a';
    const syncEditorState = vi.fn();
    const timerCallbacks: Array<() => void> = [];
    const runtime = createEditorHistoryRuntime({
      editor,
      getActiveTabId: () => 'tab-1',
      saveCurrentTabState: vi.fn(),
      setTimer: ((callback: () => void) => {
        timerCallbacks.push(callback);
        return 1;
      }) as typeof setTimeout,
      clearTimer: vi.fn() as unknown as typeof clearTimeout,
      syncEditorState
    });

    runtime.activateTabHistory('tab-1', 'a');
    runtime.updateLastCursor();
    editor.value = 'ab';
    runtime.handleKeystrokeHistory({ inputType: 'insertText', data: 'b' } as InputEvent);
    timerCallbacks.at(-1)?.();

    expect(syncEditorState).toHaveBeenCalledWith(expect.objectContaining({
      canUndo: true
    }));
  });
});
