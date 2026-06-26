export interface GlobalShortcutEventLike {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  preventDefault(): void;
  shiftKey: boolean;
}

export interface GlobalShortcutContext {
  activeElement: Element | null;
  editorElement: Element | null;
  editorHasSelection: boolean;
  hasDocumentSelection: boolean;
  viewMode: string;
}

export interface GlobalShortcutHandlers {
  closeActiveOverlays(): void;
  closeTab(): void;
  copyMarkdown(): void;
  exportMarkdown(): void;
  newTab(): void;
  redo(): void;
  toggleSyncScrolling(): void;
  undo(): void;
}

function isCommandKey(event: GlobalShortcutEventLike): boolean {
  return event.ctrlKey || event.metaKey;
}

function isTextControlElement(element: Element | null): boolean {
  const tagName = element?.tagName;
  return tagName === 'TEXTAREA' || tagName === 'INPUT';
}

export function handleGlobalEditorShortcut(
  event: GlobalShortcutEventLike,
  context: GlobalShortcutContext,
  handlers: GlobalShortcutHandlers
): boolean {
  const isCmdOrCtrl = isCommandKey(event);
  const key = event.key;
  const lowerKey = key.toLowerCase();
  let handled = false;

  if (context.activeElement === context.editorElement) {
    if (isCmdOrCtrl && !event.shiftKey && lowerKey === 'z') {
      event.preventDefault();
      handlers.undo();
      return true;
    }
    if ((isCmdOrCtrl && event.shiftKey && lowerKey === 'z') || (isCmdOrCtrl && lowerKey === 'y')) {
      event.preventDefault();
      handlers.redo();
      return true;
    }
  }

  if (isCmdOrCtrl && key === 's') {
    event.preventDefault();
    handlers.exportMarkdown();
    handled = true;
  }

  if (isCmdOrCtrl && key === 'c') {
    if (
      !isTextControlElement(context.activeElement) &&
      !context.hasDocumentSelection &&
      !context.editorHasSelection
    ) {
      event.preventDefault();
      handlers.copyMarkdown();
      handled = true;
    }
  }

  if (isCmdOrCtrl && event.shiftKey && lowerKey === 's') {
    event.preventDefault();
    if (context.viewMode === 'split') {
      handlers.toggleSyncScrolling();
    }
    handled = true;
  }

  if (event.altKey && event.shiftKey && lowerKey === 't') {
    event.preventDefault();
    handlers.newTab();
    handled = true;
  }

  if (event.altKey && event.shiftKey && lowerKey === 'w') {
    event.preventDefault();
    handlers.closeTab();
    handled = true;
  }

  if (key === 'Escape') {
    handlers.closeActiveOverlays();
    handled = true;
  }

  return handled;
}
