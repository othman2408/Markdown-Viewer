import { describe, expect, it, vi } from 'vitest';
import {
  deferPreviewWork,
  getPreviewRenderDelay,
  type DeferredPreviewRuntime
} from '../../../lib/preview/previewTiming';

function createRuntime(): {
  runtime: DeferredPreviewRuntime;
  frameCallbacks: FrameRequestCallback[];
  idleCallbacks: IdleRequestCallback[];
  timeoutCallbacks: Array<() => void>;
} {
  const frameCallbacks: FrameRequestCallback[] = [];
  const idleCallbacks: IdleRequestCallback[] = [];
  const timeoutCallbacks: Array<() => void> = [];

  return {
    frameCallbacks,
    idleCallbacks,
    timeoutCallbacks,
    runtime: {
      requestAnimationFrame: vi.fn((callback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      }),
      cancelAnimationFrame: vi.fn(),
      requestIdleCallback: vi.fn((callback) => {
        idleCallbacks.push(callback);
        return idleCallbacks.length;
      }),
      cancelIdleCallback: vi.fn(),
      setTimeout: vi.fn((callback) => {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      }),
      clearTimeout: vi.fn()
    }
  };
}

describe('preview render timing', () => {
  it('chooses render delay from markdown size thresholds', () => {
    const options = {
      largeDocumentThreshold: 10,
      hugeDocumentThreshold: 20,
      renderDelay: 100,
      largeRenderDelay: 160,
      hugeRenderDelay: 240
    };

    expect(getPreviewRenderDelay('short', options)).toBe(100);
    expect(getPreviewRenderDelay('x'.repeat(10), options)).toBe(160);
    expect(getPreviewRenderDelay('x'.repeat(20), options)).toBe(240);
  });

  it('defers work through animation frame and idle callback', () => {
    const callback = vi.fn();
    const { runtime, frameCallbacks, idleCallbacks } = createRuntime();

    deferPreviewWork(callback, 15, {
      hugeDocumentThreshold: 20,
      runtime
    });

    expect(callback).not.toHaveBeenCalled();
    frameCallbacks[0](0);
    expect(runtime.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 350 });
    idleCallbacks[0]({ didTimeout: false, timeRemaining: () => 10 });

    expect(callback).toHaveBeenCalledOnce();
  });

  it('uses the longer idle timeout for huge documents', () => {
    const { runtime, frameCallbacks } = createRuntime();

    deferPreviewWork(vi.fn(), 20, {
      hugeDocumentThreshold: 20,
      runtime
    });

    frameCallbacks[0](0);

    expect(runtime.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 700 });
  });

  it('falls back to timeout when idle callback is unavailable', () => {
    const callback = vi.fn();
    const { runtime, frameCallbacks, timeoutCallbacks } = createRuntime();
    runtime.requestIdleCallback = undefined;
    runtime.cancelIdleCallback = undefined;

    deferPreviewWork(callback, 15, {
      hugeDocumentThreshold: 20,
      runtime
    });

    frameCallbacks[0](0);
    expect(runtime.setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
    timeoutCallbacks[0]();

    expect(callback).toHaveBeenCalledOnce();
  });

  it('cancels queued frame, idle, and timeout work', () => {
    const callback = vi.fn();
    const first = createRuntime();
    const cancelBeforeFrame = deferPreviewWork(callback, 15, {
      hugeDocumentThreshold: 20,
      runtime: first.runtime
    });
    cancelBeforeFrame();
    expect(first.runtime.cancelAnimationFrame).toHaveBeenCalledWith(1);
    first.frameCallbacks[0](0);
    expect(callback).not.toHaveBeenCalled();

    const second = createRuntime();
    const cancelDuringIdle = deferPreviewWork(callback, 15, {
      hugeDocumentThreshold: 20,
      runtime: second.runtime
    });
    second.frameCallbacks[0](0);
    cancelDuringIdle();
    expect(second.runtime.cancelIdleCallback).toHaveBeenCalledWith(1);
    second.idleCallbacks[0]({ didTimeout: false, timeRemaining: () => 10 });
    expect(callback).not.toHaveBeenCalled();

    const third = createRuntime();
    third.runtime.requestIdleCallback = undefined;
    third.runtime.cancelIdleCallback = undefined;
    const cancelDuringTimeout = deferPreviewWork(callback, 15, {
      hugeDocumentThreshold: 20,
      runtime: third.runtime
    });
    third.frameCallbacks[0](0);
    cancelDuringTimeout();
    expect(third.runtime.clearTimeout).toHaveBeenCalledWith(1);
    third.timeoutCallbacks[0]();
    expect(callback).not.toHaveBeenCalled();
  });
});
