export interface PreviewRenderDelayOptions {
  largeDocumentThreshold: number;
  hugeDocumentThreshold: number;
  renderDelay: number;
  largeRenderDelay: number;
  hugeRenderDelay: number;
}

export interface DeferredPreviewRuntime {
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, timeoutMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface DeferredPreviewOptions {
  hugeDocumentThreshold: number;
  idleTimeoutMs?: number;
  hugeIdleTimeoutMs?: number;
  runtime?: Partial<DeferredPreviewRuntime>;
}

export type CancelDeferredPreviewWork = () => void;

function getRuntime(): DeferredPreviewRuntime {
  const runtime = typeof window !== 'undefined' ? window : globalThis;
  const clearTimeoutRef = (handle: unknown) => runtime.clearTimeout(handle as ReturnType<typeof setTimeout>);
  const requestFrame = typeof runtime.requestAnimationFrame === 'function'
    ? runtime.requestAnimationFrame.bind(runtime)
    : ((callback: FrameRequestCallback) => runtime.setTimeout(() => callback(Date.now()), 0) as unknown as number);
  const cancelFrame = typeof runtime.cancelAnimationFrame === 'function'
    ? runtime.cancelAnimationFrame.bind(runtime)
    : ((handle: number) => clearTimeoutRef(handle));

  return {
    requestAnimationFrame: requestFrame,
    cancelAnimationFrame: cancelFrame,
    requestIdleCallback: typeof runtime.requestIdleCallback === 'function'
      ? (runtime.requestIdleCallback as typeof window.requestIdleCallback).bind(runtime)
      : undefined,
    cancelIdleCallback: typeof runtime.cancelIdleCallback === 'function'
      ? (runtime.cancelIdleCallback as typeof window.cancelIdleCallback).bind(runtime)
      : undefined,
    setTimeout: (callback, timeoutMs) => runtime.setTimeout(callback, timeoutMs),
    clearTimeout: clearTimeoutRef
  };
}

export function getPreviewRenderDelay(markdown: string, options: PreviewRenderDelayOptions): number {
  const length = markdown.length;
  if (length >= options.hugeDocumentThreshold) return options.hugeRenderDelay;
  if (length >= options.largeDocumentThreshold) return options.largeRenderDelay;
  return options.renderDelay;
}

export function deferPreviewWork(
  callback: () => void,
  rawLength: number,
  options: DeferredPreviewOptions
): CancelDeferredPreviewWork {
  const runtime = { ...getRuntime(), ...options.runtime };
  const idleTimeoutMs = options.idleTimeoutMs ?? 350;
  const hugeIdleTimeoutMs = options.hugeIdleTimeoutMs ?? 700;
  let cancelled = false;
  let rafId: number | null = null;
  let idleId: number | null = null;
  let timeoutId: unknown = null;

  rafId = runtime.requestAnimationFrame(() => {
    rafId = null;
    if (cancelled) return;

    if (runtime.requestIdleCallback) {
      idleId = runtime.requestIdleCallback(() => {
        idleId = null;
        if (!cancelled) callback();
      }, {
        timeout: rawLength >= options.hugeDocumentThreshold ? hugeIdleTimeoutMs : idleTimeoutMs
      });
      return;
    }

    timeoutId = runtime.setTimeout(() => {
      timeoutId = null;
      if (!cancelled) callback();
    }, 0);
  });

  return function cancelDeferredPreviewWork() {
    cancelled = true;
    if (rafId !== null) runtime.cancelAnimationFrame(rafId);
    if (idleId !== null && runtime.cancelIdleCallback) runtime.cancelIdleCallback(idleId);
    if (timeoutId !== null) runtime.clearTimeout(timeoutId);
  };
}
