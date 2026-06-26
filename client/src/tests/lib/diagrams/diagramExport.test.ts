// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  downloadSvgWithFallback,
  fetchSvgOriginalDimensions,
  getDiagramPngUrlFromSvgUrl,
  parseSvgOriginalDimensions
} from '../../../lib/diagrams/diagramExport';

describe('diagram export helpers', () => {
  it('converts Kroki SVG URLs to PNG URLs', () => {
    expect(getDiagramPngUrlFromSvgUrl('https://kroki.io/d2/svg/abc')).toBe('https://kroki.io/d2/png/abc');
    expect(getDiagramPngUrlFromSvgUrl('https://example.com/image.svg')).toBe('https://example.com/image.svg');
  });

  it('parses dimensions from width and height attributes', () => {
    expect(parseSvgOriginalDimensions('<svg width="120" height="80"></svg>')).toEqual({
      width: 120,
      height: 80,
      text: '<svg width="120" height="80"></svg>'
    });
  });

  it('prefers viewBox dimensions when available', () => {
    expect(parseSvgOriginalDimensions('<svg width="120" height="80" viewBox="0 0 640 480"></svg>')).toEqual({
      width: 640,
      height: 480,
      text: '<svg width="120" height="80" viewBox="0 0 640 480"></svg>'
    });
  });

  it('returns null for SVG text without usable dimensions', () => {
    expect(parseSvgOriginalDimensions('<svg></svg>')).toBeNull();
    expect(parseSvgOriginalDimensions('<div></div>')).toBeNull();
  });

  it('fetches original SVG dimensions and warns on failures', async () => {
    await expect(fetchSvgOriginalDimensions('https://example.test/diagram.svg', {
      fetchFn: async () => ({
        ok: true,
        text: async () => '<svg width="20" height="10"></svg>'
      })
    })).resolves.toEqual({
      width: 20,
      height: 10,
      text: '<svg width="20" height="10"></svg>'
    });

    await expect(fetchSvgOriginalDimensions('https://example.test/missing.svg', {
      fetchFn: async () => ({
        ok: false,
        text: async () => '<svg width="20" height="10"></svg>'
      })
    })).resolves.toBeNull();

    const warn = vi.fn();
    await expect(fetchSvgOriginalDimensions('https://example.test/bad.svg', {
      fetchFn: async () => {
        throw new Error('offline');
      },
      warn
    })).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('Failed to parse SVG dimensions:', expect.any(Error));
  });

  it('downloads fetched SVG blobs and restores button feedback', async () => {
    const img = document.createElement('img');
    const button = document.createElement('button');
    const anchor = document.createElement('a');
    const click = vi.fn();
    const revokeObjectUrl = vi.fn();
    button.innerHTML = 'Original';
    img.src = 'https://example.test/d2/svg/abc';
    anchor.click = click;

    await downloadSvgWithFallback(img, 'diagram.svg', button, 'Original', {
      fetchFn: async () => ({
        ok: true,
        status: 200,
        blob: async () => new Blob(['svg'], { type: 'image/svg+xml' }),
        text: async () => ''
      }),
      createObjectUrl: () => 'blob:svg',
      revokeObjectUrl,
      createAnchor: () => anchor,
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      }
    });

    expect(anchor.href).toBe('blob:svg');
    expect(anchor.download).toBe('diagram.svg');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:svg');
    expect(button.innerHTML).toBe('Original');
  });

  it('falls back to direct SVG link downloads when fetch fails', async () => {
    const img = document.createElement('img');
    const button = document.createElement('button');
    const anchor = document.createElement('a');
    const warn = vi.fn();
    const click = vi.fn();
    button.innerHTML = 'Original';
    img.src = 'https://example.test/d2/svg/abc';
    anchor.click = click;

    await downloadSvgWithFallback(img, 'fallback.svg', button, 'Original', {
      fetchFn: async () => ({
        ok: false,
        status: 503,
        blob: async () => new Blob(),
        text: async () => ''
      }),
      createAnchor: () => anchor,
      setTimeoutFn: (callback) => {
        callback();
        return 1;
      },
      warn
    });

    expect(warn).toHaveBeenCalledWith(
      'SVG fetch download failed, attempting fallback direct link download:',
      expect.any(Error)
    );
    expect(anchor.href).toBe('https://example.test/d2/svg/abc');
    expect(anchor.download).toBe('fallback.svg');
    expect(anchor.target).toBe('_blank');
    expect(click).toHaveBeenCalledOnce();
    expect(button.innerHTML).toBe('Original');
  });

  it('shows failure feedback when both SVG download paths fail', async () => {
    const img = document.createElement('img');
    const button = document.createElement('button');
    const error = vi.fn();
    const restoreCallbacks: Array<() => void> = [];
    button.innerHTML = 'Original';
    img.src = 'https://example.test/d2/svg/abc';

    await downloadSvgWithFallback(img, 'fallback.svg', button, 'Original', {
      fetchFn: async () => {
        throw new Error('offline');
      },
      createAnchor: () => {
        throw new Error('anchor failed');
      },
      setTimeoutFn: (callback) => {
        restoreCallbacks.push(callback);
        return 1;
      },
      error
    });

    expect(error).toHaveBeenCalledWith('SVG download completely failed:', expect.any(Error));
    expect(button.innerHTML).toBe('<i class="bi bi-x-lg"></i>');
    restoreCallbacks[0]();
    expect(button.innerHTML).toBe('Original');
  });
});
