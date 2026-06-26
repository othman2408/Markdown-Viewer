import {
  prepareAlignmentBlockInsertion,
  prepareClearDocumentReplacement,
  prepareLineTransform,
  prepareMarkdownBlockInsertion,
  prepareMarkdownListApplication,
  prepareMarkdownListEnter,
  prepareSelectionOrCurrentLineTransform,
  prepareWrappedSelection,
  renumberOrderedListAfterPosition
} from '../markdown/editing';

type LineTransformer = (text: string) => string;
export type MarkdownEditingRuntimeOptions = {
  editor: HTMLTextAreaElement;
  markProgrammaticInput(value: string): void;
  pushProgrammaticHistoryState(): void;
  renderMarkdown(): void;
  saveCurrentTabState(): void;
  updateFindHighlights(): void;
  updateLineNumbers(): void;
};

export type MarkdownEditingRuntime = {
  applyClearFormatting(): void;
  applyMarkdownList(type: 'ordered' | 'unordered'): void;
  handleListEnter(event: KeyboardEvent): boolean;
  insertAlignmentBlock(align: 'left' | 'center' | 'right'): void;
  insertMarkdownBlock(block: string, startOverride?: number, endOverride?: number): void;
  replaceEditorRange(start: number, end: number, replacement: string, selectStart?: number, selectEnd?: number): void;
  transformEditorLines(transformer: LineTransformer): void;
  transformSelectionOrCurrentLine(transformer: LineTransformer): void;
  wrapEditorSelection(prefix: string, suffix: string, placeholder: string): void;
};

export function createMarkdownEditingRuntime(
  options: MarkdownEditingRuntimeOptions
): MarkdownEditingRuntime {
  const editor = options.editor;

  function replaceEditorRange(
    start: number,
    end: number,
    replacement: string,
    selectStart?: number,
    selectEnd?: number
  ): void {
    options.pushProgrammaticHistoryState();
    editor.focus();
    editor.setRangeText(replacement, start, end, 'end');
    const nextStart = typeof selectStart === 'number' ? selectStart : start + replacement.length;
    const nextEnd = typeof selectEnd === 'number' ? selectEnd : nextStart;
    editor.setSelectionRange(nextStart, nextEnd);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    options.markProgrammaticInput(editor.value);
  }

  function wrapEditorSelection(prefix: string, suffix: string, placeholder: string): void {
    const prepared = prepareWrappedSelection({
      end: editor.selectionEnd,
      placeholder,
      prefix,
      start: editor.selectionStart,
      suffix,
      value: editor.value
    });
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
  }

  function transformEditorLines(transformer: LineTransformer): void {
    const prepared = prepareLineTransform({
      end: editor.selectionEnd,
      start: editor.selectionStart,
      transformer,
      value: editor.value
    });
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
  }

  function applyMarkdownList(type: 'ordered' | 'unordered'): void {
    const prepared = prepareMarkdownListApplication({
      selectionEnd: editor.selectionEnd,
      selectionStart: editor.selectionStart,
      type,
      value: editor.value
    });
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
  }

  function renumberOrderedListAfterEditorPosition(position: number, nextNumber: number): void {
    const value = renumberOrderedListAfterPosition(editor.value, position, nextNumber);
    if (value !== null) {
      const selectionStart = editor.selectionStart;
      const selectionEnd = editor.selectionEnd;
      editor.value = value;
      editor.setSelectionRange(selectionStart, selectionEnd);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function handleListEnter(event: KeyboardEvent): boolean {
    if (event.key !== 'Enter' || event.shiftKey || editor.selectionStart !== editor.selectionEnd) {
      return false;
    }
    const prepared = prepareMarkdownListEnter({
      selectionEnd: editor.selectionEnd,
      selectionStart: editor.selectionStart,
      value: editor.value
    });
    if (!prepared) return false;

    event.preventDefault();
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
    if (prepared.renumber) {
      renumberOrderedListAfterEditorPosition(prepared.renumber.position, prepared.renumber.nextNumber);
    }
    return true;
  }

  function transformSelectionOrCurrentLine(transformer: LineTransformer): void {
    const prepared = prepareSelectionOrCurrentLineTransform({
      selectionEnd: editor.selectionEnd,
      selectionStart: editor.selectionStart,
      transformer,
      value: editor.value
    });
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
  }

  function applyClearFormatting(): void {
    const prepared = prepareClearDocumentReplacement({
      value: editor.value
    });
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
    options.renderMarkdown();
    options.updateLineNumbers();
    options.updateFindHighlights();
    options.saveCurrentTabState();
  }

  function insertAlignmentBlock(align: 'left' | 'center' | 'right'): void {
    const prepared = prepareAlignmentBlockInsertion({
      align,
      end: editor.selectionEnd,
      start: editor.selectionStart,
      value: editor.value
    });
    if (!prepared) {
      console.warn('Unsupported alignment:', align);
      return;
    }
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
  }

  function insertMarkdownBlock(block: string, startOverride?: number, endOverride?: number): void {
    const start = typeof startOverride === 'number' ? startOverride : editor.selectionStart;
    const end = typeof endOverride === 'number' ? endOverride : editor.selectionEnd;
    const prepared = prepareMarkdownBlockInsertion({
      block,
      end,
      start,
      value: editor.value
    });
    replaceEditorRange(
      prepared.start,
      prepared.end,
      prepared.replacement,
      prepared.selectionStart,
      prepared.selectionEnd
    );
  }

  return {
    applyClearFormatting,
    applyMarkdownList,
    handleListEnter,
    insertAlignmentBlock,
    insertMarkdownBlock,
    replaceEditorRange,
    transformEditorLines,
    transformSelectionOrCurrentLine,
    wrapEditorSelection
  };
}
