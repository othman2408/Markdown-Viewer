import { describe, expect, it, vi } from 'vitest';
import {
  createSyncScrollController,
  type SyncScrollElement
} from '../../../lib/editor/syncScrollController';

function createElement(input: Partial<SyncScrollElement> = {}): SyncScrollElement {
  return {
    clientHeight: 100,
    scrollHeight: 500,
    scrollTop: 0,
    ...input
  };
}

function createController(input: {
  editor?: SyncScrollElement;
  initialEnabled?: boolean;
  previewPane?: SyncScrollElement;
} = {}) {
  const editor = input.editor ?? createElement();
  const previewPane = input.previewPane ?? createElement();
  const frameCallbacks: Array<() => void> = [];
  const resetCallbacks: Array<() => void> = [];
  const persistEnabled = vi.fn<(enabled: boolean) => void>();
  const syncEditorScrollOverlays = vi.fn<() => void>();
  const syncState = vi.fn<(enabled: boolean) => void>();
  const cancelFrame = vi.fn<(handle: unknown) => void>();
  const requestFrame = vi.fn((callback: () => void) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  });
  const setTimeoutFn = vi.fn((callback: () => void) => {
    resetCallbacks.push(callback);
    return resetCallbacks.length;
  });
  const controller = createSyncScrollController({
    cancelFrame,
    editor,
    initialEnabled: input.initialEnabled,
    persistEnabled,
    previewPane,
    requestFrame,
    setTimeoutFn,
    syncEditorScrollOverlays,
    syncState
  });

  return {
    cancelFrame,
    controller,
    editor,
    frameCallbacks,
    persistEnabled,
    previewPane,
    requestFrame,
    resetCallbacks,
    setTimeoutFn,
    syncEditorScrollOverlays,
    syncState
  };
}

describe('sync scroll controller', () => {
  it('syncs editor scroll ratio to preview scroll position', () => {
    const context = createController();
    context.editor.scrollTop = 200;

    context.controller.syncEditorToPreview();
    context.frameCallbacks[0]();

    expect(context.previewPane.scrollTop).toBe(200);
    expect(context.setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 50);

    context.resetCallbacks[0]();
    context.controller.syncPreviewToEditor();
    expect(context.requestFrame).toHaveBeenCalledTimes(2);
  });

  it('syncs preview scroll ratio to editor scroll position and updates overlays', () => {
    const context = createController({
      editor: createElement({ scrollHeight: 900 }),
      previewPane: createElement({ scrollHeight: 500, scrollTop: 100 })
    });

    context.controller.syncPreviewToEditor();
    context.frameCallbacks[0]();

    expect(context.editor.scrollTop).toBe(200);
    expect(context.syncEditorScrollOverlays).toHaveBeenCalledOnce();
  });

  it('guards against disabled, active reciprocal, and programmatic scrolls', () => {
    const context = createController({ initialEnabled: false });

    context.controller.syncEditorToPreview();
    expect(context.requestFrame).not.toHaveBeenCalled();

    context.controller.toggle();
    context.controller.setProgrammaticScrolling(true);
    context.controller.syncEditorToPreview();
    expect(context.requestFrame).not.toHaveBeenCalled();

    context.controller.setProgrammaticScrolling(false);
    context.controller.syncEditorToPreview();
    context.controller.syncPreviewToEditor();
    expect(context.requestFrame).toHaveBeenCalledOnce();
  });

  it('toggles enabled state with persistence and state sync', () => {
    const context = createController({ initialEnabled: true });

    expect(context.syncState).toHaveBeenCalledWith(true);
    expect(context.controller.toggle()).toBe(false);

    expect(context.controller.getEnabled()).toBe(false);
    expect(context.persistEnabled).toHaveBeenCalledWith(false);
    expect(context.syncState).toHaveBeenLastCalledWith(false);
  });

  it('cancels an existing pending frame before scheduling the next one', () => {
    const context = createController();

    context.controller.syncEditorToPreview();
    context.resetCallbacks[0]?.();
    context.controller.syncEditorToPreview();

    expect(context.cancelFrame).toHaveBeenCalledWith(1);
  });
});
