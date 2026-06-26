// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canResizePane,
  createResizeDividerController,
  getResizeKeyboardDelta
} from '../../../lib/editor/resizeDividerBehavior';

declare global {
  interface Window {
    markdownViewerPaneResizer?: {
      apply(): void;
      reset(): void;
      refreshLayout(): void;
    };
    markdownViewerEditorGeometry?: {
      refreshAfterPaneLayout(): void;
    };
  }
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width
  });
}

function createPaneDom(): {
  content: HTMLElement;
  divider: HTMLDivElement;
  editorPane: HTMLElement;
  previewPane: HTMLElement;
} {
  document.body.innerHTML = `
    <main class="content-container">
      <section class="editor-pane"></section>
      <div class="resize-divider"></div>
      <section class="preview-pane"></section>
    </main>
  `;
  const content = document.querySelector<HTMLElement>('.content-container');
  const divider = document.querySelector<HTMLDivElement>('.resize-divider');
  const editorPane = document.querySelector<HTMLElement>('.editor-pane');
  const previewPane = document.querySelector<HTMLElement>('.preview-pane');

  if (!content || !divider || !editorPane || !previewPane) {
    throw new Error('Expected pane resize test DOM');
  }

  content.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1000,
    bottom: 400,
    width: 1000,
    height: 400,
    toJSON: () => ({})
  });

  return {
    content,
    divider,
    editorPane,
    previewPane
  };
}

function createControllerState() {
  return {
    editorWidthPercent: 50,
    isResizing: false,
    viewMode: 'split'
  };
}

describe('resize divider behavior', () => {
  const defaultViewportWidth = window.innerWidth;

  afterEach(() => {
    document.body.innerHTML = '';
    document.body.classList.remove('resizing');
    delete window.markdownViewerEditorGeometry;
    delete window.markdownViewerPaneResizer;
    setViewportWidth(defaultViewportWidth);
    vi.restoreAllMocks();
  });

  it('checks split-view and viewport eligibility before resizing', () => {
    expect(canResizePane('split', 1280)).toBe(true);
    expect(canResizePane('editor', 1280)).toBe(false);
    expect(canResizePane('split', 900)).toBe(false);
  });

  it('maps resize keyboard commands to pane deltas', () => {
    expect(getResizeKeyboardDelta('ArrowLeft')).toBe(-5);
    expect(getResizeKeyboardDelta('ArrowRight')).toBe(5);
    expect(getResizeKeyboardDelta('Home')).toBe(0);
  });

  it('clamps pointer resizing and clears drag state on mouseup', () => {
    setViewportWidth(1280);
    const { divider, editorPane, previewPane } = createPaneDom();
    const state = createControllerState();
    const controller = createResizeDividerController({
      getEditorWidthPercent: () => state.editorWidthPercent,
      setEditorWidthPercent: (percent) => {
        state.editorWidthPercent = percent;
      },
      getIsResizing: () => state.isResizing,
      setIsResizing: (resizing) => {
        state.isResizing = resizing;
      },
      getViewMode: () => state.viewMode
    });
    const cleanup = controller.attach(divider);

    const mouseDown = new MouseEvent('mousedown', { clientX: 500, bubbles: true, cancelable: true });
    divider.dispatchEvent(mouseDown);

    expect(mouseDown.defaultPrevented).toBe(true);
    expect(state.isResizing).toBe(true);
    expect(document.body.classList.contains('resizing')).toBe(true);

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 950, bubbles: true }));

    expect(state.editorWidthPercent).toBe(80);
    expect(editorPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.8 - 4px)');
    expect(previewPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.2 - 4px)');

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(state.isResizing).toBe(false);
    expect(document.body.classList.contains('resizing')).toBe(false);
    cleanup?.();
  });

  it('resizes by keyboard only in split view', () => {
    setViewportWidth(1280);
    const { divider, editorPane } = createPaneDom();
    const state = createControllerState();
    const controller = createResizeDividerController({
      getEditorWidthPercent: () => state.editorWidthPercent,
      setEditorWidthPercent: (percent) => {
        state.editorWidthPercent = percent;
      },
      getIsResizing: () => state.isResizing,
      setIsResizing: (resizing) => {
        state.isResizing = resizing;
      },
      getViewMode: () => state.viewMode
    });
    const cleanup = controller.attach(divider);

    const arrowRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    divider.dispatchEvent(arrowRight);

    expect(arrowRight.defaultPrevented).toBe(true);
    expect(state.editorWidthPercent).toBe(55);
    expect(editorPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.55 - 4px)');

    state.viewMode = 'preview';
    const arrowLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    divider.dispatchEvent(arrowLeft);

    expect(arrowLeft.defaultPrevented).toBe(false);
    expect(state.editorWidthPercent).toBe(55);
    cleanup?.();
  });

  it('exposes and cleans up the pane resizer bridge', () => {
    setViewportWidth(1280);
    const { divider, editorPane, previewPane } = createPaneDom();
    const state = createControllerState();
    const refreshAfterPaneLayout = vi.fn();
    window.markdownViewerEditorGeometry = { refreshAfterPaneLayout };
    const controller = createResizeDividerController({
      getEditorWidthPercent: () => state.editorWidthPercent,
      setEditorWidthPercent: (percent) => {
        state.editorWidthPercent = percent;
      },
      getIsResizing: () => state.isResizing,
      setIsResizing: (resizing) => {
        state.isResizing = resizing;
      },
      getViewMode: () => state.viewMode
    });
    const cleanup = controller.attach(divider);

    window.markdownViewerPaneResizer?.apply();

    expect(editorPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.5 - 4px)');
    expect(previewPane.style.flex).toBe('0 0 calc((100% - var(--dock-width, 0px)) * 0.5 - 4px)');
    expect(refreshAfterPaneLayout).toHaveBeenCalledTimes(1);

    window.markdownViewerPaneResizer?.reset();

    expect(editorPane.style.flex).toBe('');
    expect(previewPane.style.flex).toBe('');
    expect(refreshAfterPaneLayout).toHaveBeenCalledTimes(2);

    cleanup?.();

    expect(window.markdownViewerPaneResizer).toBeUndefined();
  });
});
