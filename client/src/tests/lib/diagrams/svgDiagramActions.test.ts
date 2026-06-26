// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  copySvgDiagramImage,
  copyModalDiagramImage,
  downloadModalDiagramPng,
  downloadModalDiagramSvg,
  downloadSvgDiagramPng,
  downloadSvgDiagramSource
} from '../../../lib/diagrams/svgDiagramActions';

function createContainer(): { button: HTMLButtonElement; container: HTMLElement; svg: SVGElement } {
  const container = document.createElement('div');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  const button = document.createElement('button');
  button.innerHTML = 'Original';
  container.appendChild(svg);
  return { button, container, svg };
}

function createPngCanvas(blob = new Blob(['png'], { type: 'image/png' })): HTMLCanvasElement {
  return {
    toBlob: vi.fn((callback: BlobCallback, type?: string) => {
      callback(type === 'image/png' ? blob : null);
    })
  } as unknown as HTMLCanvasElement;
}

describe('SVG diagram actions', () => {
  it('downloads an SVG diagram as PNG and restores feedback', async () => {
    const { button, container, svg } = createContainer();
    const click = vi.fn();
    const revokeObjectUrl = vi.fn();
    const anchor = document.createElement('a');
    const canvas = createPngCanvas();
    const setTimeoutFn = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    anchor.click = click;

    await downloadSvgDiagramPng(container, button, {
      createAnchor: () => anchor,
      createObjectUrl: () => 'blob:png',
      filenamePrefix: 'score',
      label: 'ABC',
      now: () => 123,
      revokeObjectUrl,
      setTimeoutFn,
      svgToCanvasFn: vi.fn(async (svgElement) => {
        expect(svgElement).toBe(svg);
        return canvas;
      })
    });

    expect(anchor.href).toBe('blob:png');
    expect(anchor.download).toBe('score-123.png');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:png');
    expect(button.innerHTML).toBe('Original');
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1500);
  });

  it('copies an SVG diagram PNG to the clipboard', async () => {
    const { button, container } = createContainer();
    const writeClipboard = vi.fn(() => Promise.resolve());
    class TestClipboardItem {
      value: Record<string, Blob>;
      constructor(value: Record<string, Blob>) {
        this.value = value;
      }
    }

    await copySvgDiagramImage(container, button, {
      clipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      },
      svgToCanvasFn: async () => createPngCanvas(),
      writeClipboard
    });

    expect(writeClipboard).toHaveBeenCalledWith([expect.any(TestClipboardItem)]);
    expect(button.innerHTML).toBe('Original');
  });

  it('shows copy failure feedback and restores the button', async () => {
    const { button, container } = createContainer();
    const error = vi.fn();
    const restoreCallbacks: Array<() => void> = [];
    class TestClipboardItem {
      constructor(_value: Record<string, Blob>) {}
    }

    await copySvgDiagramImage(container, button, {
      clipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
      error,
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      setTimeoutFn: (callback) => {
        restoreCallbacks.push(callback);
        return 1;
      },
      svgToCanvasFn: async () => createPngCanvas(),
      writeClipboard: vi.fn(() => Promise.reject(new Error('denied')))
    });

    expect(error).toHaveBeenCalledWith('Clipboard write failed:', expect.any(Error));
    expect(button.innerHTML).toBe('<i class="bi bi-x-lg"></i>');
    restoreCallbacks[0]();
    expect(button.innerHTML).toBe('Original');
  });

  it('resets the original button on PNG rendering failure', async () => {
    const { button, container } = createContainer();
    const error = vi.fn();

    await downloadSvgDiagramPng(container, button, {
      error,
      filenamePrefix: 'score',
      label: 'ABC',
      svgToCanvasFn: async () => {
        throw new Error('render failed');
      }
    });

    expect(error).toHaveBeenCalledWith('ABC PNG export failed:', expect.any(Error));
    expect(button.innerHTML).toBe('Original');
  });

  it('downloads serialized SVG source and restores feedback', () => {
    const { button, container } = createContainer();
    const click = vi.fn();
    const anchor = document.createElement('a');
    const revokeObjectUrl = vi.fn();
    const setTimeoutFn = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });
    anchor.click = click;

    downloadSvgDiagramSource(container, button, {
      createAnchor: () => anchor,
      createObjectUrl: (blob) => {
        expect(blob.type).toBe('image/svg+xml');
        return 'blob:svg';
      },
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      now: () => 456,
      revokeObjectUrl,
      setTimeoutFn
    });

    expect(anchor.href).toBe('blob:svg');
    expect(anchor.download).toBe('diagram-456.svg');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:svg');
    expect(button.innerHTML).toBe('Original');
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1500);
  });

  it('does nothing when a container has no SVG', async () => {
    const container = document.createElement('div');
    const button = document.createElement('button');
    const svgToCanvasFn = vi.fn();
    button.innerHTML = 'Original';

    await downloadSvgDiagramPng(container, button, {
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      svgToCanvasFn
    });
    await copySvgDiagramImage(container, button, {
      filenamePrefix: 'diagram',
      label: 'Mermaid',
      svgToCanvasFn
    });
    downloadSvgDiagramSource(container, button, {
      filenamePrefix: 'diagram',
      label: 'Mermaid'
    });

    expect(svgToCanvasFn).not.toHaveBeenCalled();
    expect(button.innerHTML).toBe('Original');
  });

  it('downloads modal remote images through their PNG URL', async () => {
    const image = document.createElement('img');
    const button = document.createElement('button');
    const anchor = document.createElement('a');
    const click = vi.fn();
    const fetchFn = vi.fn(async () => ({
      blob: async () => new Blob(['png'], { type: 'image/png' })
    }));
    button.innerHTML = 'Original';
    image.src = 'https://example.test/d2/svg/abc';
    anchor.click = click;

    await downloadModalDiagramPng(image, button, {
      createAnchor: () => anchor,
      createObjectUrl: () => 'blob:modal-png',
      fetchFn,
      getPngUrl: (url) => url.replace('/svg/', '/png/'),
      now: () => 789,
      revokeObjectUrl: vi.fn(),
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      }
    });

    expect(fetchFn).toHaveBeenCalledWith('https://example.test/d2/png/abc');
    expect(anchor.href).toBe('blob:modal-png');
    expect(anchor.download).toBe('diagram-789.png');
    expect(click).toHaveBeenCalledOnce();
    expect(button.innerHTML).toBe('Original');
  });

  it('copies modal SVG elements as PNG images', async () => {
    const { svg } = createContainer();
    const button = document.createElement('button');
    const writeClipboard = vi.fn(() => Promise.resolve());
    class TestClipboardItem {
      value: Record<string, Blob>;
      constructor(value: Record<string, Blob>) {
        this.value = value;
      }
    }
    button.innerHTML = 'Original';

    await copyModalDiagramImage(svg, button, {
      clipboardItemCtor: TestClipboardItem as unknown as typeof ClipboardItem,
      getPngUrl: (url) => url,
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      },
      svgToCanvasFn: async () => createPngCanvas(),
      writeClipboard
    });

    expect(writeClipboard).toHaveBeenCalledWith([expect.any(TestClipboardItem)]);
    expect(button.innerHTML).toBe('Original');
  });

  it('downloads modal SVG source for both inline SVG and image elements', async () => {
    const { svg } = createContainer();
    const image = document.createElement('img');
    const anchor = document.createElement('a');
    const click = vi.fn();
    const fetchFn = vi.fn(async () => ({
      blob: async () => new Blob(['svg'], { type: 'image/svg+xml' })
    }));
    anchor.click = click;
    image.src = 'https://example.test/d2/svg/abc';

    await downloadModalDiagramSvg(svg, {
      createAnchor: () => anchor,
      createObjectUrl: () => 'blob:inline-svg',
      now: () => 11,
      revokeObjectUrl: vi.fn()
    });
    await downloadModalDiagramSvg(image, {
      createAnchor: () => anchor,
      createObjectUrl: () => 'blob:remote-svg',
      fetchFn,
      now: () => 12,
      revokeObjectUrl: vi.fn()
    });

    expect(fetchFn).toHaveBeenCalledWith('https://example.test/d2/svg/abc');
    expect(anchor.download).toBe('diagram-12.svg');
    expect(click).toHaveBeenCalledTimes(2);
  });
});
