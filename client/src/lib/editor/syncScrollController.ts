export interface SyncScrollElement {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

export interface SyncScrollControllerOptions {
  cancelFrame?: (handle: unknown) => void;
  editor: SyncScrollElement;
  initialEnabled?: boolean;
  persistEnabled: (enabled: boolean) => void;
  previewPane: SyncScrollElement;
  requestFrame?: (callback: () => void) => unknown;
  resetDelayMs?: number;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  syncEditorScrollOverlays: () => void;
  syncState: (enabled: boolean) => void;
}

export interface SyncScrollController {
  getEnabled(): boolean;
  setProgrammaticScrolling(value: boolean): void;
  syncEditorToPreview(): void;
  syncPreviewToEditor(): void;
  toggle(): boolean;
}

const DEFAULT_SCROLL_RESET_DELAY_MS = 50;

function getScrollRatio(element: SyncScrollElement): number {
  const range = element.scrollHeight - element.clientHeight;
  return range > 0 ? element.scrollTop / range : 0;
}

function getScrollPosition(element: SyncScrollElement, ratio: number): number {
  return (element.scrollHeight - element.clientHeight) * ratio;
}

function isValidScrollPosition(value: number): boolean {
  return !Number.isNaN(value) && Number.isFinite(value);
}

export function createSyncScrollController(
  options: SyncScrollControllerOptions
): SyncScrollController {
  const requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle as number));
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const resetDelayMs = options.resetDelayMs ?? DEFAULT_SCROLL_RESET_DELAY_MS;
  let enabled = options.initialEnabled ?? true;
  let isEditorScrolling = false;
  let isPreviewScrolling = false;
  let isProgrammaticScrolling = false;
  let scrollSyncFrame: unknown = null;

  options.syncState(enabled);

  const cancelPendingFrame = () => {
    if (scrollSyncFrame) {
      cancelFrame(scrollSyncFrame);
      scrollSyncFrame = null;
    }
  };

  return {
    getEnabled() {
      return enabled;
    },

    setProgrammaticScrolling(value: boolean) {
      isProgrammaticScrolling = value;
    },

    syncEditorToPreview() {
      if (!enabled || isPreviewScrolling || isProgrammaticScrolling) return;
      isEditorScrolling = true;
      cancelPendingFrame();
      scrollSyncFrame = requestFrame(() => {
        const previewScrollPosition = getScrollPosition(
          options.previewPane,
          getScrollRatio(options.editor)
        );
        if (isValidScrollPosition(previewScrollPosition)) {
          options.previewPane.scrollTop = previewScrollPosition;
        }
        setTimeoutFn(() => {
          isEditorScrolling = false;
        }, resetDelayMs);
      });
    },

    syncPreviewToEditor() {
      if (!enabled || isEditorScrolling || isProgrammaticScrolling) return;
      isPreviewScrolling = true;
      cancelPendingFrame();
      scrollSyncFrame = requestFrame(() => {
        const editorScrollPosition = getScrollPosition(
          options.editor,
          getScrollRatio(options.previewPane)
        );
        if (isValidScrollPosition(editorScrollPosition)) {
          options.editor.scrollTop = editorScrollPosition;
          options.syncEditorScrollOverlays();
        }
        setTimeoutFn(() => {
          isPreviewScrolling = false;
        }, resetDelayMs);
      });
    },

    toggle() {
      enabled = !enabled;
      options.persistEnabled(enabled);
      options.syncState(enabled);
      return enabled;
    }
  };
}
