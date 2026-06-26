export interface EditorInputEventLike {
  inputType?: string;
}

export interface EditorInputState {
  isFindModalOpen: boolean;
}

export interface EditorInputHandlers {
  debouncedRender(): void;
  handleKeystrokeHistory(event: EditorInputEventLike): void;
  scheduleCurrentTabSave(): void;
  scheduleFindRefresh(): void;
  scheduleLineNumberUpdate(options: { inputType: string }): void;
  updateFindHighlights(): void;
}

export interface KeyboardEventLike {
  key: string;
  preventDefault(): void;
}

export interface TextareaEditTarget {
  dispatchEvent(event: Event): boolean;
  selectionEnd: number;
  selectionStart: number;
  value: string;
}

export function getEditorInputType(event: EditorInputEventLike | null | undefined): string {
  return event && typeof event.inputType === 'string' ? event.inputType : '';
}

export function handleEditorInputEvent(
  event: EditorInputEventLike,
  state: EditorInputState,
  handlers: EditorInputHandlers
): void {
  handlers.handleKeystrokeHistory(event);
  handlers.debouncedRender();
  handlers.scheduleCurrentTabSave();
  if (state.isFindModalOpen) {
    handlers.scheduleFindRefresh();
  } else {
    handlers.updateFindHighlights();
  }
  handlers.scheduleLineNumberUpdate({
    inputType: getEditorInputType(event)
  });
}

export function handleTabIndent(
  event: KeyboardEventLike,
  textarea: TextareaEditTarget,
  indent = '  '
): boolean {
  if (event.key !== 'Tab') return false;

  event.preventDefault();
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  textarea.value = value.substring(0, start) + indent + value.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + indent.length;
  textarea.dispatchEvent(new Event('input'));
  return true;
}
