// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  attachEditorLayoutController,
  type EditorLayoutWindowTarget
} from '../../../lib/editor/layoutController';

function createWindowTarget(innerWidth = 1200) {
  const listeners = new Map<string, (event: Event) => void>();
  const windowRef: EditorLayoutWindowTarget = {
    innerWidth,
    addEventListener: vi.fn((type: 'resize', listener: (event: Event) => void) => {
      listeners.set(type, listener);
    }),
    removeEventListener: vi.fn((type: 'resize', listener: (event: Event) => void) => {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    })
  };

  return {
    dispatchResize() {
      listeners.get('resize')?.(new Event('resize'));
    },
    hasResizeListener() {
      return listeners.has('resize');
    },
    windowRef
  };
}

function createController(input: {
  findDocked?: boolean;
  findOpen?: boolean;
  innerWidth?: number;
} = {}) {
  const previewPane = document.createElement('div');
  const windowTarget = createWindowTarget(input.innerWidth ?? 1200);
  const pendingTimeouts: Array<() => void> = [];
  const callbacks = {
    clearTimeoutFn: vi.fn(),
    constrainFloatingPanelPosition: vi.fn(),
    initEditorGeometry: vi.fn(),
    refreshEditorWidth: vi.fn(),
    scheduleLineNumberUpdate: vi.fn(),
    setTimeoutFn: vi.fn((callback: () => void) => {
      pendingTimeouts.push(callback);
      return pendingTimeouts.length;
    }),
    syncPreviewToEditor: vi.fn(),
    toggleFindDockMode: vi.fn()
  };
  const controller = attachEditorLayoutController({
    clearTimeoutFn: callbacks.clearTimeoutFn,
    constrainFloatingPanelPosition: callbacks.constrainFloatingPanelPosition,
    getFindDocked: () => Boolean(input.findDocked),
    getFindOpen: () => Boolean(input.findOpen),
    initEditorGeometry: callbacks.initEditorGeometry,
    previewPane,
    refreshEditorWidth: callbacks.refreshEditorWidth,
    scheduleLineNumberUpdate: callbacks.scheduleLineNumberUpdate,
    setTimeoutFn: callbacks.setTimeoutFn,
    syncPreviewToEditor: callbacks.syncPreviewToEditor,
    toggleFindDockMode: callbacks.toggleFindDockMode,
    windowRef: windowTarget.windowRef
  });

  return {
    ...callbacks,
    controller,
    pendingTimeouts,
    previewPane,
    windowTarget
  };
}

describe('editor layout controller', () => {
  it('debounces resize layout work and clears the previous handle', () => {
    const context = createController();

    context.windowTarget.dispatchResize();
    context.windowTarget.dispatchResize();

    expect(context.setTimeoutFn).toHaveBeenCalledTimes(2);
    expect(context.setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 100);
    expect(context.clearTimeoutFn).toHaveBeenCalledWith(1);

    context.pendingTimeouts[1]();

    expect(context.initEditorGeometry).toHaveBeenCalledOnce();
    expect(context.refreshEditorWidth).toHaveBeenCalledOnce();
    expect(context.scheduleLineNumberUpdate).toHaveBeenCalledOnce();
    expect(context.constrainFloatingPanelPosition).toHaveBeenCalledOnce();
    expect(context.toggleFindDockMode).not.toHaveBeenCalled();
  });

  it('undocks the find panel on mobile resize when it is open and docked', () => {
    const context = createController({
      findDocked: true,
      findOpen: true,
      innerWidth: 900
    });

    context.windowTarget.dispatchResize();
    context.pendingTimeouts[0]();

    expect(context.toggleFindDockMode).toHaveBeenCalledWith(true);
  });

  it('routes preview-pane scroll to preview-to-editor sync', () => {
    const context = createController();

    context.previewPane.dispatchEvent(new Event('scroll'));

    expect(context.syncPreviewToEditor).toHaveBeenCalledOnce();
  });

  it('detaches resize and preview scroll listeners and clears pending resize work', () => {
    const context = createController();
    context.windowTarget.dispatchResize();

    context.controller.detach();
    context.windowTarget.dispatchResize();
    context.previewPane.dispatchEvent(new Event('scroll'));

    expect(context.windowTarget.hasResizeListener()).toBe(false);
    expect(context.clearTimeoutFn).toHaveBeenCalledWith(1);
    expect(context.setTimeoutFn).toHaveBeenCalledOnce();
    expect(context.syncPreviewToEditor).not.toHaveBeenCalled();
  });
});
