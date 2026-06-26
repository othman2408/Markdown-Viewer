// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderCanvasToPdfPages } from '../../../lib/export/pdfPages';

describe('PDF page rendering helpers', () => {
  it('slices a captured canvas into PDF pages with progress updates', async () => {
    const drawImage = vi.fn();
    const pageCanvases: HTMLCanvasElement[] = [];
    const sourceCanvas = {
      height: 600,
      width: 200
    } as HTMLCanvasElement;
    const documentRef = {
      createElement: vi.fn(() => {
        const pageIndex = pageCanvases.length + 1;
        const pageCanvas = {
          height: 0,
          width: 0,
          getContext: vi.fn(() => ({ drawImage })),
          toDataURL: vi.fn(() => `data:image/png;base64,page-${pageIndex}`)
        } as unknown as HTMLCanvasElement;
        pageCanvases.push(pageCanvas);
        return pageCanvas;
      })
    } as unknown as Document;
    const pdf = {
      addImage: vi.fn(),
      addPage: vi.fn()
    };
    const updateProgress = vi.fn();
    const throwIfAborted = vi.fn();
    const waitForPage = vi.fn(() => Promise.resolve());

    const result = await renderCanvasToPdfPages(sourceCanvas, pdf, {
      contentWidth: 100,
      documentRef,
      margin: 10,
      pageHeight: 110,
      throwIfAborted,
      updateProgress,
      waitForPage
    });

    expect(result).toEqual({
      imageHeight: 300,
      pagesCount: 4,
      scaleFactor: 2
    });
    expect(documentRef.createElement).toHaveBeenCalledTimes(4);
    expect(pdf.addPage).toHaveBeenCalledTimes(3);
    expect(throwIfAborted).toHaveBeenCalledTimes(4);
    expect(waitForPage).toHaveBeenCalledTimes(4);
    expect(updateProgress).toHaveBeenLastCalledWith(94, 'Rendering page 4 of 4');
    expect(pageCanvases[0].width).toBe(200);
    expect(pageCanvases[0].height).toBe(180);
    expect(pageCanvases[3].height).toBe(60);
    expect(drawImage).toHaveBeenNthCalledWith(1, sourceCanvas, 0, 0, 200, 180, 0, 0, 200, 180);
    expect(drawImage).toHaveBeenNthCalledWith(4, sourceCanvas, 0, 540, 200, 60, 0, 0, 200, 60);
    expect(pdf.addImage).toHaveBeenNthCalledWith(1, 'data:image/png;base64,page-1', 'PNG', 10, 10, 100, 90);
    expect(pdf.addImage).toHaveBeenNthCalledWith(4, 'data:image/png;base64,page-4', 'PNG', 10, 10, 100, 30);
  });

  it('rejects when page canvas context is unavailable', async () => {
    const canvas = {
      height: 100,
      width: 100
    } as HTMLCanvasElement;
    const documentRef = {
      createElement: vi.fn(() => ({
        getContext: vi.fn(() => null)
      }))
    } as unknown as Document;

    await expect(renderCanvasToPdfPages(canvas, {
      addImage: vi.fn(),
      addPage: vi.fn()
    }, {
      contentWidth: 100,
      documentRef,
      margin: 10,
      pageHeight: 100
    })).rejects.toThrow('Canvas 2D context is not available.');
  });
});
