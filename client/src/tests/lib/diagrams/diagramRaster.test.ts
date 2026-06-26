// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { rasterizeDiagramImageToPngBlob } from '../../../lib/diagrams/diagramRaster';

function createImageElement(src = 'https://example.test/d2/svg/abc'): HTMLImageElement {
  const image = document.createElement('img');
  image.src = src;
  Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 300 });
  Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 150 });
  image.width = 120;
  image.height = 60;
  return image;
}

function createCanvasHarness(trigger: 'load' | 'error' = 'load') {
  const pngBlob = new Blob(['png'], { type: 'image/png' });
  const context = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    scale: vi.fn()
  };
  const canvas = {
    height: 0,
    width: 0,
    getContext: vi.fn(() => context),
    toBlob: vi.fn((callback: BlobCallback, type?: string) => {
      callback(type === 'image/png' ? pngBlob : null);
    })
  } as unknown as HTMLCanvasElement;
  let assignedSrc = '';
  const loadedImage = {} as HTMLImageElement;
  Object.defineProperty(loadedImage, 'src', {
    configurable: true,
    get: () => assignedSrc,
    set: (value: string) => {
      assignedSrc = value;
      queueMicrotask(() => {
        const handler = trigger === 'load' ? loadedImage.onload : loadedImage.onerror;
        if (typeof handler === 'function') {
          handler.call(loadedImage, new Event(trigger));
        }
      });
    }
  });

  return {
    assignedSrc: () => assignedSrc,
    canvas,
    context,
    loadedImage,
    pngBlob
  };
}

describe('diagram raster helpers', () => {
  it('rasterizes SVG text with original viewBox dimensions', async () => {
    const imgEl = createImageElement();
    const harness = createCanvasHarness();
    const createObjectUrl = vi.fn(() => 'blob:svg-source');

    const blob = await rasterizeDiagramImageToPngBlob(imgEl, {
      createCanvas: () => harness.canvas,
      createImage: () => harness.loadedImage,
      createObjectUrl,
      fetchSvgDimensions: async () => ({
        height: 480,
        text: '<svg viewBox="0 0 640 480"></svg>',
        width: 640
      })
    });

    expect(blob).toBe(harness.pngBlob);
    expect(harness.canvas.width).toBe(1280);
    expect(harness.canvas.height).toBe(960);
    expect(harness.context.fillStyle).toBe('#ffffff');
    expect(harness.context.fillRect).toHaveBeenCalledWith(0, 0, 1280, 960);
    expect(harness.context.scale).toHaveBeenCalledWith(2, 2);
    expect(harness.context.drawImage).toHaveBeenCalledWith(harness.loadedImage, 0, 0, 640, 480);
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(harness.assignedSrc()).toBe('blob:svg-source');
  });

  it('uses rendered image dimensions when original SVG dimensions are unavailable', async () => {
    const imgEl = createImageElement('https://example.test/diagram.svg');
    const harness = createCanvasHarness();

    await rasterizeDiagramImageToPngBlob(imgEl, {
      createCanvas: () => harness.canvas,
      createImage: () => harness.loadedImage,
      fetchSvgDimensions: async () => null
    });

    expect(harness.canvas.width).toBe(600);
    expect(harness.canvas.height).toBe(300);
    expect(harness.context.drawImage).toHaveBeenCalledWith(harness.loadedImage, 0, 0, 300, 150);
    expect(harness.assignedSrc()).toBe('https://example.test/diagram.svg');
  });

  it('falls back to drawing the existing image when the loaded source errors', async () => {
    const imgEl = createImageElement();
    const harness = createCanvasHarness('error');

    const blob = await rasterizeDiagramImageToPngBlob(imgEl, {
      createCanvas: () => harness.canvas,
      createImage: () => harness.loadedImage,
      fetchSvgDimensions: async () => null
    });

    expect(blob).toBe(harness.pngBlob);
    expect(harness.context.drawImage).toHaveBeenCalledWith(imgEl, 0, 0, 300, 150);
  });

  it('rejects when canvas PNG encoding fails', async () => {
    const imgEl = createImageElement();
    const harness = createCanvasHarness();
    vi.mocked(harness.canvas.toBlob).mockImplementation((callback: BlobCallback) => {
      callback(null);
    });

    await expect(rasterizeDiagramImageToPngBlob(imgEl, {
      createCanvas: () => harness.canvas,
      createImage: () => harness.loadedImage,
      fetchSvgDimensions: async () => null
    })).rejects.toThrow('Canvas toBlob failed');
  });
});
