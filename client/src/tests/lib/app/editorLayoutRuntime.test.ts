// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createEditorLayoutRuntime } from '../../../lib/app/editorLayoutRuntime';

function createRuntime() {
  const editor = document.createElement('textarea');
  const lineNumbers = document.createElement('div');
  const highlightLayer = document.createElement('div');
  editor.value = 'one\ntwo';
  Object.defineProperty(editor, 'clientWidth', { configurable: true, value: 320 });
  Object.defineProperty(editor, 'clientHeight', { configurable: true, value: 120 });
  Object.defineProperty(editor, 'scrollHeight', { configurable: true, value: 400 });
  document.body.append(editor, lineNumbers, highlightLayer);

  const runtime = createEditorLayoutRuntime({
    editor,
    editorHighlightLayer: highlightLayer,
    isEditorVisible: () => true,
    lineNumbers,
    syncEditorState: vi.fn(),
    updateFindHighlights: vi.fn()
  });

  return { editor, highlightLayer, lineNumbers, runtime };
}

describe('editor layout runtime', () => {
  it('tracks scroll snapshots and syncs overlays', () => {
    const { editor, highlightLayer, lineNumbers, runtime } = createRuntime();

    runtime.setScrollSnapshot({ scrollLeft: 4, scrollTop: 12 });
    runtime.syncHighlightScroll();

    expect(runtime.getScrollSnapshot()).toEqual({ scrollLeft: 4, scrollTop: 12 });
    expect(highlightLayer.scrollTop).toBe(12);

    editor.scrollTop = 30;
    editor.scrollLeft = 7;
    runtime.syncEditorScrollOverlays();

    expect(lineNumbers.scrollTop).toBe(30);
    expect(highlightLayer.scrollLeft).toBe(7);
  });

  it('builds line number state when visible', () => {
    const editor = document.createElement('textarea');
    const lineNumbers = document.createElement('div');
    editor.value = 'one\ntwo\nthree';
    Object.defineProperty(editor, 'clientWidth', { configurable: true, value: 320 });
    document.body.append(editor, lineNumbers);
    const syncEditorState = vi.fn();
    const runtime = createEditorLayoutRuntime({
      editor,
      editorHighlightLayer: null,
      isEditorVisible: () => true,
      lineNumbers,
      syncEditorState,
      updateFindHighlights: vi.fn()
    });

    runtime.refreshEditorWidth();
    runtime.updateLineNumbers({ force: true });

    expect(syncEditorState).toHaveBeenCalledWith(expect.objectContaining({
      lineNumbers: expect.objectContaining({ lineCount: 3 })
    }));
  });
});
