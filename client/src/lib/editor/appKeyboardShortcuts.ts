import {
  handleFindReplaceShortcut,
  type FindReplaceShortcutHandlers
} from '../modals/findReplace';
import {
  handleGlobalEditorShortcut,
  type GlobalShortcutHandlers
} from './shortcuts';

export interface AppKeyboardShortcutControllerOptions {
  documentRef?: Document;
  editorElement: HTMLTextAreaElement;
  findReplaceHandlers: FindReplaceShortcutHandlers;
  getActiveElement?: () => Element | null;
  getEditorHasSelection?: () => boolean;
  getFindReplaceOpen: () => boolean;
  getHasDocumentSelection?: () => boolean;
  getViewMode: () => string;
  globalHandlers: GlobalShortcutHandlers;
}

export interface AppKeyboardShortcutController {
  detach: () => void;
}

function hasEditorSelection(editorElement: HTMLTextAreaElement): boolean {
  return editorElement.selectionStart !== editorElement.selectionEnd;
}

function hasDocumentSelection(documentRef: Document): boolean {
  const selection = documentRef.defaultView?.getSelection?.();
  return Boolean(selection?.toString().trim().length);
}

export function attachAppKeyboardShortcutController(
  options: AppKeyboardShortcutControllerOptions
): AppKeyboardShortcutController {
  const documentRef = options.documentRef ?? document;

  const handleKeydown = (event: KeyboardEvent) => {
    handleFindReplaceShortcut(event, {
      documentRef,
      isFindModalOpen: options.getFindReplaceOpen()
    }, options.findReplaceHandlers);

    handleGlobalEditorShortcut(event, {
      activeElement: options.getActiveElement ? options.getActiveElement() : documentRef.activeElement,
      editorElement: options.editorElement,
      editorHasSelection: options.getEditorHasSelection
        ? options.getEditorHasSelection()
        : hasEditorSelection(options.editorElement),
      hasDocumentSelection: options.getHasDocumentSelection
        ? options.getHasDocumentSelection()
        : hasDocumentSelection(documentRef),
      viewMode: options.getViewMode()
    }, options.globalHandlers);
  };

  documentRef.addEventListener('keydown', handleKeydown);

  return {
    detach() {
      documentRef.removeEventListener('keydown', handleKeydown);
    }
  };
}
