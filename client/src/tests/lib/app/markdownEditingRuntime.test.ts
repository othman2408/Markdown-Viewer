// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createMarkdownEditingRuntime } from '../../../lib/app/markdownEditingRuntime';

function createRuntime(initialValue = 'hello') {
  const editor = document.createElement('textarea');
  editor.value = initialValue;
  document.body.appendChild(editor);
  const options = {
    markProgrammaticInput: vi.fn(),
    pushProgrammaticHistoryState: vi.fn(),
    renderMarkdown: vi.fn(),
    saveCurrentTabState: vi.fn(),
    updateFindHighlights: vi.fn(),
    updateLineNumbers: vi.fn()
  };
  return {
    editor,
    options,
    runtime: createMarkdownEditingRuntime({ editor, ...options })
  };
}

describe('markdown editing runtime', () => {
  it('wraps the current selection and records programmatic input', () => {
    const { editor, options, runtime } = createRuntime('hello');
    editor.setSelectionRange(0, 5);

    runtime.wrapEditorSelection('**', '**', 'bold text');

    expect(editor.value).toBe('**hello**');
    expect(options.pushProgrammaticHistoryState).toHaveBeenCalledOnce();
    expect(options.markProgrammaticInput).toHaveBeenCalledWith('**hello**');
  });

  it('clears formatting and refreshes editor derived state', () => {
    const { editor, options, runtime } = createRuntime('**hello**');

    runtime.applyClearFormatting();

    expect(editor.value).toBe('');
    expect(options.renderMarkdown).toHaveBeenCalledOnce();
    expect(options.updateLineNumbers).toHaveBeenCalledOnce();
    expect(options.updateFindHighlights).toHaveBeenCalledOnce();
    expect(options.saveCurrentTabState).toHaveBeenCalledOnce();
  });
});
