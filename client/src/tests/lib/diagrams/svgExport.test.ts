// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { svgToCanvas, svgToDataUrl } from '../../../lib/diagrams/svgExport';

function createSvg(): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '5');
  svg.appendChild(circle);
  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: 120,
      height: 40
    })
  });
  return svg;
}

describe('SVG export helpers', () => {
  it('serializes SVGs to data URLs with explicit dimensions', () => {
    const url = svgToDataUrl(createSvg());
    const decoded = decodeURIComponent(url.replace('data:image/svg+xml;charset=utf-8,', ''));

    expect(decoded).toContain('<svg');
    expect(decoded).toContain('width="120"');
    expect(decoded).toContain('height="40"');
    expect(decoded).toContain('<circle');
  });

  it('renders SVGs onto a scaled canvas with a themed background', async () => {
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    const scale = vi.fn();
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getContext', {
      configurable: true,
      value: () => ({
        drawImage,
        fillRect,
        scale,
        fillStyle: ''
      })
    });
    const documentRef = {
      createElement: vi.fn(() => canvas)
    } as unknown as Document;
    const image = {} as HTMLImageElement;
    Object.defineProperty(image, 'src', {
      set() {
        image.onload?.(new Event('load'));
      }
    });

    const renderedCanvas = await svgToCanvas(createSvg(), {
      documentRef,
      getBackgroundColor: () => '#101010',
      imageFactory: () => image,
      scale: 2
    });

    expect(renderedCanvas).toBe(canvas);
    expect(canvas.width).toBe(240);
    expect(canvas.height).toBe(80);
    expect(scale).toHaveBeenCalledWith(2, 2);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 120, 40);
    expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 120, 40);
  });
});
