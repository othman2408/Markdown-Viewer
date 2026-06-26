import {
  handleEditorInputEvent,
  handleTabIndent,
  type EditorInputHandlers
} from './inputEvents';

export interface EditorTextareaScrollSnapshot {
  scrollLeft: number;
  scrollTop: number;
}

export interface EditorTextareaControllerOptions {
  editorElement: HTMLTextAreaElement;
  getFindModalOpen: () => boolean;
  handleListEnter: (event: KeyboardEvent) => boolean;
  inputHandlers: EditorInputHandlers;
  onScrollSnapshot: (snapshot: EditorTextareaScrollSnapshot) => void;
  saveCurrentTabState: () => void;
  scheduleEditorOverlayScrollSync: () => void;
  syncEditorToPreview: () => void;
  updateLastCursor: (event: Event) => void;
}

export interface EditorTextareaController {
  detach: () => void;
}

export function attachEditorTextareaController(
  options: EditorTextareaControllerOptions
): EditorTextareaController {
  const editor = options.editorElement;

  const handleInput = (event: Event) => {
    handleEditorInputEvent(event as InputEvent, {
      isFindModalOpen: options.getFindModalOpen()
    }, options.inputHandlers);
  };

  const handleChange = () => {
    options.saveCurrentTabState();
  };

  const handleEditingKeydown = (event: KeyboardEvent) => {
    if (options.handleListEnter(event)) {
      return;
    }
    handleTabIndent(event, editor);
  };

  const handleScroll = () => {
    options.onScrollSnapshot({
      scrollLeft: editor.scrollLeft,
      scrollTop: editor.scrollTop
    });
    options.syncEditorToPreview();
    options.scheduleEditorOverlayScrollSync();
  };

  editor.addEventListener('input', handleInput);
  editor.addEventListener('change', handleChange);
  editor.addEventListener('keydown', options.updateLastCursor);
  editor.addEventListener('keyup', options.updateLastCursor);
  editor.addEventListener('mousedown', options.updateLastCursor);
  editor.addEventListener('mouseup', options.updateLastCursor);
  editor.addEventListener('focus', options.updateLastCursor);
  editor.addEventListener('keydown', handleEditingKeydown);
  editor.addEventListener('scroll', handleScroll);

  return {
    detach() {
      editor.removeEventListener('input', handleInput);
      editor.removeEventListener('change', handleChange);
      editor.removeEventListener('keydown', options.updateLastCursor);
      editor.removeEventListener('keyup', options.updateLastCursor);
      editor.removeEventListener('mousedown', options.updateLastCursor);
      editor.removeEventListener('mouseup', options.updateLastCursor);
      editor.removeEventListener('focus', options.updateLastCursor);
      editor.removeEventListener('keydown', handleEditingKeydown);
      editor.removeEventListener('scroll', handleScroll);
    }
  };
}
