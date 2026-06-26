import {
  getPreviewWorkerLibraryUrls,
  getPreviewWorkerUrl,
  shouldUsePreviewWorker,
  type PreviewSegmentBlock,
  type PreviewWorkerContext,
  type PreviewWorkerLibraryUrls
} from './previewSegments';

export interface PreviewWorkerRenderContext extends PreviewWorkerContext {
  renderId?: unknown;
}

export interface PreviewWorkerRenderResult {
  mode?: string;
  blocks?: PreviewSegmentBlock[];
}

export interface PreviewWorkerClientOptions {
  enabled: boolean;
  threshold: number;
  timeoutMs: number;
  minimumBlocks: number;
  getWorkerUrl?: () => string;
  getLibraryUrls?: () => PreviewWorkerLibraryUrls;
  hasWorkerRuntime?: () => boolean;
  workerFactory?: (url: string) => Worker;
  setTimeoutFn?: (callback: () => void, timeoutMs: number) => unknown;
  clearTimeoutFn?: (timeoutId: unknown) => void;
}

interface PendingPreviewWorkerRequest {
  resolve: (result: PreviewWorkerRenderResult) => void;
  reject: (error: Error) => void;
  timeoutId: unknown;
}

export interface PreviewWorkerClient {
  readonly unavailable: boolean;
  shouldUse(rawVal: string, context: PreviewWorkerRenderContext): boolean;
  render(rawVal: string, context: PreviewWorkerRenderContext): Promise<PreviewWorkerRenderResult>;
  destroy(error?: Error): void;
}

function createWorkerFromRuntime(url: string): Worker {
  return new Worker(url);
}

function defaultHasWorkerRuntime(): boolean {
  return typeof Worker !== 'undefined' && typeof URL !== 'undefined';
}

export function createPreviewWorkerClient(options: PreviewWorkerClientOptions): PreviewWorkerClient {
  let worker: Worker | null = null;
  let workerUnavailable = false;
  let requestCounter = 0;
  let failureCount = 0;
  const pendingRequests = new Map<number, PendingPreviewWorkerRequest>();

  const getWorkerUrl = options.getWorkerUrl ?? getPreviewWorkerUrl;
  const getLibraryUrls = options.getLibraryUrls ?? getPreviewWorkerLibraryUrls;
  const hasWorkerRuntime = options.hasWorkerRuntime ?? defaultHasWorkerRuntime;
  const workerFactory = options.workerFactory ?? createWorkerFromRuntime;
  const setTimeoutFn = options.setTimeoutFn ?? ((callback, timeoutMs) => setTimeout(callback, timeoutMs));
  const clearTimeoutFn = options.clearTimeoutFn ?? ((timeoutId) => clearTimeout(timeoutId as ReturnType<typeof setTimeout>));

  function terminateWorker(): void {
    if (!worker) return;
    try {
      worker.terminate();
    } catch (e) {
      // Ignore worker shutdown failures; fallback rendering continues on main.
    }
    worker = null;
  }

  function rejectPendingRequests(error: Error): void {
    pendingRequests.forEach((pending) => {
      clearTimeoutFn(pending.timeoutId);
      pending.reject(error);
    });
    pendingRequests.clear();
  }

  function markWorkerFailure(error?: Error): void {
    failureCount += 1;
    if (failureCount >= 2) {
      workerUnavailable = true;
    }
    terminateWorker();
    rejectPendingRequests(error || new Error('Preview worker unavailable.'));
  }

  function recordRenderFailure(): void {
    failureCount += 1;
    if (failureCount < 2) return;
    workerUnavailable = true;
    terminateWorker();
  }

  function getWorker(): Worker | null {
    if (workerUnavailable) return null;
    if (worker) return worker;

    try {
      worker = workerFactory(getWorkerUrl());
      worker.onmessage = (event: MessageEvent) => {
        const data = event.data || {};
        const pending = pendingRequests.get(data.requestId);
        if (!pending) return;

        clearTimeoutFn(pending.timeoutId);
        pendingRequests.delete(data.requestId);

        if (data.type === 'render-result') {
          failureCount = 0;
          pending.resolve(data.result);
        } else {
          recordRenderFailure();
          pending.reject(new Error(data.error || 'Preview worker render failed.'));
        }
      };
      worker.onerror = (event: ErrorEvent) => {
        markWorkerFailure(event && event.message ? new Error(event.message) : new Error('Preview worker failed.'));
      };
    } catch (e) {
      markWorkerFailure(e instanceof Error ? e : new Error(String(e)));
      return null;
    }

    return worker;
  }

  function render(rawVal: string, context: PreviewWorkerRenderContext): Promise<PreviewWorkerRenderResult> {
    const activeWorker = getWorker();
    if (!activeWorker) {
      return Promise.reject(new Error('Preview worker unavailable.'));
    }

    const requestId = ++requestCounter;
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeoutFn(() => {
        pendingRequests.delete(requestId);
        recordRenderFailure();
        reject(new Error('Preview worker timed out.'));
      }, options.timeoutMs);

      pendingRequests.set(requestId, { resolve, reject, timeoutId });
      activeWorker.postMessage({
        type: 'render',
        requestId,
        markdown: rawVal,
        options: {
          minimumBlocks: options.minimumBlocks,
          libraryUrls: getLibraryUrls(),
          renderId: context.renderId
        }
      });
    });
  }

  return {
    get unavailable() {
      return workerUnavailable;
    },
    shouldUse(rawVal, context) {
      return shouldUsePreviewWorker(rawVal, context, {
        enabled: options.enabled,
        workerUnavailable,
        hasWorkerRuntime: hasWorkerRuntime(),
        threshold: options.threshold
      });
    },
    render,
    destroy(error) {
      workerUnavailable = true;
      terminateWorker();
      rejectPendingRequests(error || new Error('Preview worker unavailable.'));
    }
  };
}
