import { describe, expect, it, vi } from 'vitest';
import { canvasToPngBlob, saveCanvasAsPng } from '../../../lib/export/pngExport';

describe('PNG export helpers', () => {
  it('converts canvas content to a PNG blob', async () => {
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    const canvas = {
      toBlob: vi.fn((callback: BlobCallback, type?: string) => {
        callback(type === 'image/png' ? pngBlob : null);
      })
    } as unknown as HTMLCanvasElement;

    await expect(canvasToPngBlob(canvas)).resolves.toBe(pngBlob);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it('saves a canvas PNG with the requested filename', async () => {
    const pngBlob = new Blob(['png'], { type: 'image/png' });
    const saveAsFn = vi.fn();
    const canvas = {
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(pngBlob);
      })
    } as unknown as HTMLCanvasElement;

    await saveCanvasAsPng(canvas, 'document.png', { saveAsFn });

    expect(saveAsFn).toHaveBeenCalledWith(pngBlob, 'document.png');
  });

  it('rejects when canvas PNG encoding fails', async () => {
    const canvas = {
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(null);
      })
    } as unknown as HTMLCanvasElement;

    await expect(canvasToPngBlob(canvas)).rejects.toThrow('Canvas toBlob failed');
  });
});
