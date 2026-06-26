export interface EditorLayoutWindowTarget {
  innerWidth: number;
  addEventListener(type: 'resize', listener: (event: Event) => void): void;
  removeEventListener(type: 'resize', listener: (event: Event) => void): void;
}

export interface EditorLayoutControllerOptions {
  clearTimeoutFn?: (handle: unknown) => void;
  constrainFloatingPanelPosition: () => void;
  getFindDocked: () => boolean;
  getFindOpen: () => boolean;
  initEditorGeometry: () => void;
  previewPane: HTMLElement;
  refreshEditorWidth: () => void;
  resizeDelayMs?: number;
  scheduleLineNumberUpdate: () => void;
  setTimeoutFn?: (callback: () => void, delayMs: number) => unknown;
  syncPreviewToEditor: () => void;
  toggleFindDockMode: (forceFloating?: boolean) => void;
  windowRef?: EditorLayoutWindowTarget;
}

export interface EditorLayoutController {
  detach: () => void;
}

const DEFAULT_RESIZE_DELAY_MS = 100;
const FIND_PANEL_MOBILE_BREAKPOINT = 1080;

export function attachEditorLayoutController(
  options: EditorLayoutControllerOptions
): EditorLayoutController {
  const windowRef = options.windowRef ?? window;
  const resizeDelayMs = options.resizeDelayMs ?? DEFAULT_RESIZE_DELAY_MS;
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let resizeLayoutTimeout: unknown = null;

  const runResizeLayout = () => {
    options.initEditorGeometry();
    options.refreshEditorWidth();
    options.scheduleLineNumberUpdate();
    if (
      windowRef.innerWidth < FIND_PANEL_MOBILE_BREAKPOINT &&
      options.getFindDocked() &&
      options.getFindOpen()
    ) {
      options.toggleFindDockMode(true);
    }
    options.constrainFloatingPanelPosition();
  };

  const handleResize = () => {
    if (resizeLayoutTimeout !== null) {
      clearTimeoutFn(resizeLayoutTimeout);
    }
    resizeLayoutTimeout = setTimeoutFn(runResizeLayout, resizeDelayMs);
  };

  const handlePreviewScroll = () => {
    options.syncPreviewToEditor();
  };

  windowRef.addEventListener('resize', handleResize);
  options.previewPane.addEventListener('scroll', handlePreviewScroll);

  return {
    detach() {
      windowRef.removeEventListener('resize', handleResize);
      options.previewPane.removeEventListener('scroll', handlePreviewScroll);
      if (resizeLayoutTimeout !== null) {
        clearTimeoutFn(resizeLayoutTimeout);
        resizeLayoutTimeout = null;
      }
    }
  };
}
