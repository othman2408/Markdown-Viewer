import type { Attachment } from 'svelte/attachments';
import {
  MIN_RESIZE_VIEWPORT_WIDTH,
  applyPaneFlex,
  clampPanePercent,
  getPaneLayoutElements,
  getPanePercentFromClientX,
  resetPaneFlex
} from './paneResize';
import type { PaneResizerBridge } from './paneResizeBridge';

export interface ResizeDividerBehaviorOptions {
  getEditorWidthPercent(): number;
  setEditorWidthPercent(percent: number): void;
  getIsResizing(): boolean;
  setIsResizing(isResizing: boolean): void;
  getViewMode(): string;
  documentRef?: Document;
  windowRef?: Window & typeof globalThis;
}

export interface ResizeDividerController {
  attach: Attachment<HTMLDivElement>;
  applyPaneWidths(): void;
  resetPaneWidths(): void;
  refreshLayout(): void;
}

export function canResizePane(viewMode: string, viewportWidth: number): boolean {
  return viewportWidth >= MIN_RESIZE_VIEWPORT_WIDTH && viewMode === 'split';
}

export function getResizeKeyboardDelta(key: string): number {
  if (key === 'ArrowLeft') return -5;
  if (key === 'ArrowRight') return 5;

  return 0;
}

export function createResizeDividerController(options: ResizeDividerBehaviorOptions): ResizeDividerController {
  const documentRef = options.documentRef ?? document;
  const windowRef = options.windowRef ?? window;
  let dividerElement: HTMLDivElement | null = null;

  function canResize(): boolean {
    return canResizePane(options.getViewMode(), windowRef.innerWidth);
  }

  function refreshEditorGeometry(): void {
    windowRef.markdownViewerEditorGeometry?.refreshAfterPaneLayout?.();
  }

  function resetPaneWidths(): void {
    resetPaneFlex(getPaneLayoutElements(dividerElement));
    refreshEditorGeometry();
  }

  function applyPaneWidths(): void {
    if (!canResize()) {
      resetPaneWidths();
      return;
    }

    if (applyPaneFlex(getPaneLayoutElements(dividerElement), options.getEditorWidthPercent())) {
      refreshEditorGeometry();
    }
  }

  function refreshLayout(): void {
    if (options.getViewMode() === 'split') {
      applyPaneWidths();
      return;
    }

    resetPaneWidths();
  }

  function setResizing(isResizing: boolean): void {
    options.setIsResizing(isResizing);
    documentRef.body.classList.toggle('resizing', isResizing);
  }

  function stopResize(): void {
    if (!options.getIsResizing()) return;
    setResizing(false);
  }

  function updatePercentFromClientX(clientX: number): void {
    const { container } = getPaneLayoutElements(dividerElement);
    if (!container) return;

    const nextPercent = getPanePercentFromClientX(clientX, container.getBoundingClientRect());
    options.setEditorWidthPercent(nextPercent);
    applyPaneWidths();
  }

  const attach: Attachment<HTMLDivElement> = (node) => {
    dividerElement = node;

    const paneResizerBridge: PaneResizerBridge = {
      apply: applyPaneWidths,
      reset: resetPaneWidths,
      refreshLayout
    };

    windowRef.markdownViewerPaneResizer = paneResizerBridge;

    function startResize(event: MouseEvent): void {
      if (!canResize()) return;
      event.preventDefault();
      setResizing(true);
    }

    function startTouchResize(event: TouchEvent): void {
      if (!canResize()) return;
      event.preventDefault();
      setResizing(true);
    }

    function handleMouseMove(event: MouseEvent): void {
      if (!options.getIsResizing()) return;
      updatePercentFromClientX(event.clientX);
    }

    function handleTouchMove(event: TouchEvent): void {
      if (!options.getIsResizing() || !event.touches[0]) return;
      updatePercentFromClientX(event.touches[0].clientX);
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (options.getViewMode() !== 'split') return;

      const delta = getResizeKeyboardDelta(event.key);
      if (delta === 0) return;

      event.preventDefault();
      options.setEditorWidthPercent(clampPanePercent(options.getEditorWidthPercent() + delta));
      applyPaneWidths();
    }

    node.addEventListener('mousedown', startResize);
    node.addEventListener('touchstart', startTouchResize, { passive: false });
    node.addEventListener('keydown', handleKeydown);
    documentRef.addEventListener('mousemove', handleMouseMove);
    documentRef.addEventListener('mouseup', stopResize);
    documentRef.addEventListener('touchmove', handleTouchMove, { passive: false });
    documentRef.addEventListener('touchend', stopResize);

    return () => {
      node.removeEventListener('mousedown', startResize);
      node.removeEventListener('touchstart', startTouchResize);
      node.removeEventListener('keydown', handleKeydown);
      documentRef.removeEventListener('mousemove', handleMouseMove);
      documentRef.removeEventListener('mouseup', stopResize);
      documentRef.removeEventListener('touchmove', handleTouchMove);
      documentRef.removeEventListener('touchend', stopResize);

      setResizing(false);
      if (dividerElement === node) dividerElement = null;
      if (windowRef.markdownViewerPaneResizer === paneResizerBridge) {
        delete windowRef.markdownViewerPaneResizer;
      }
    };
  };

  return {
    attach,
    applyPaneWidths,
    resetPaneWidths,
    refreshLayout
  };
}
