import { describe, expect, it, vi } from 'vitest';
import { createPreviewWorkerClient } from '../../../lib/preview/previewWorkerClient';

class FakePreviewWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  emitError(message = 'worker failed'): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

function createClient(fakeWorker: FakePreviewWorker, overrides = {}) {
  return createPreviewWorkerClient({
    enabled: true,
    threshold: 10,
    timeoutMs: 100,
    minimumBlocks: 8,
    getWorkerUrl: () => '/preview-worker.js',
    getLibraryUrls: () => ({
      marked: '/marked.js',
      highlight: '/highlight.js',
      powershell: '/powershell.js'
    }),
    hasWorkerRuntime: () => true,
    workerFactory: () => fakeWorker as unknown as Worker,
    setTimeoutFn: () => 1,
    clearTimeoutFn: vi.fn(),
    ...overrides
  });
}

describe('preview worker client', () => {
  it('uses the segmented worker only when enabled, available, and safe', () => {
    const fakeWorker = new FakePreviewWorker();
    const client = createClient(fakeWorker);

    expect(client.shouldUse('short', {})).toBe(false);
    expect(client.shouldUse('plain paragraph\n\nsecond paragraph long enough', {})).toBe(true);
    expect(client.shouldUse('plain paragraph\n\nsecond paragraph long enough', { disableWorker: true })).toBe(false);

    const disabledClient = createClient(fakeWorker, { enabled: false });
    expect(disabledClient.shouldUse('plain paragraph\n\nsecond paragraph long enough', {})).toBe(false);
  });

  it('posts render requests with library URLs and resolves render results', async () => {
    const fakeWorker = new FakePreviewWorker();
    const client = createClient(fakeWorker);

    const promise = client.render('plain paragraph\n\nsecond paragraph', { renderId: 42 });
    expect(fakeWorker.messages).toEqual([
      {
        type: 'render',
        requestId: 1,
        markdown: 'plain paragraph\n\nsecond paragraph',
        options: {
          minimumBlocks: 8,
          libraryUrls: {
            marked: '/marked.js',
            highlight: '/highlight.js',
            powershell: '/powershell.js'
          },
          renderId: 42
        }
      }
    ]);

    fakeWorker.emitMessage({
      type: 'render-result',
      requestId: 1,
      result: {
        mode: 'segmented',
        blocks: [{ hash: 'a', html: '<p>A</p>' }]
      }
    });

    await expect(promise).resolves.toEqual({
      mode: 'segmented',
      blocks: [{ hash: 'a', html: '<p>A</p>' }]
    });
  });

  it('records render failures and disables the worker after repeated failures', async () => {
    const fakeWorker = new FakePreviewWorker();
    const client = createClient(fakeWorker);
    const markdown = 'plain paragraph\n\nsecond paragraph long enough';

    const first = client.render(markdown, { renderId: 1 });
    fakeWorker.emitMessage({
      type: 'render-error',
      requestId: 1,
      error: 'bad render'
    });
    await expect(first).rejects.toThrow('bad render');
    expect(client.shouldUse(markdown, {})).toBe(true);

    const second = client.render(markdown, { renderId: 2 });
    fakeWorker.emitMessage({
      type: 'render-error',
      requestId: 2,
      error: 'bad render again'
    });
    await expect(second).rejects.toThrow('bad render again');
    expect(fakeWorker.terminated).toBe(true);
    expect(client.unavailable).toBe(true);
    expect(client.shouldUse(markdown, {})).toBe(false);
  });

  it('rejects pending requests when the worker errors', async () => {
    const fakeWorker = new FakePreviewWorker();
    const client = createClient(fakeWorker);

    const promise = client.render('plain paragraph\n\nsecond paragraph', { renderId: 7 });
    fakeWorker.emitError('boom');

    await expect(promise).rejects.toThrow('boom');
    expect(fakeWorker.terminated).toBe(true);
  });

  it('times out pending requests and disables after repeated timeouts', async () => {
    const fakeWorker = new FakePreviewWorker();
    const timeoutCallbacks: Array<() => void> = [];
    const client = createClient(fakeWorker, {
      setTimeoutFn: (callback: () => void) => {
        timeoutCallbacks.push(callback);
        return timeoutCallbacks.length;
      }
    });

    const first = client.render('plain paragraph\n\nsecond paragraph', { renderId: 1 });
    timeoutCallbacks[0]();
    await expect(first).rejects.toThrow('Preview worker timed out.');
    expect(client.unavailable).toBe(false);

    const second = client.render('plain paragraph\n\nsecond paragraph', { renderId: 2 });
    timeoutCallbacks[1]();
    await expect(second).rejects.toThrow('Preview worker timed out.');
    expect(fakeWorker.terminated).toBe(true);
    expect(client.unavailable).toBe(true);
  });
});
