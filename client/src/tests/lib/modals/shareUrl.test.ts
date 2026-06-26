import { describe, expect, it, vi } from 'vitest';
import {
  MAX_SHARE_URL_LENGTH,
  buildShareUrl,
  getCloudShareMode,
  getCloudShareTokenFromPathname,
  getShareBaseUrl,
  getShareDocumentTitle,
  getShareViewMode,
  isShareUrlTooLarge,
  parseShareHash,
  prepareCloudShareDocument,
  prepareLocalShareDocument
} from '../../../lib/modals/shareUrl';

describe('share URL helpers', () => {
  it('builds cloud share URLs with the active document title', async () => {
    const createCloudShare = vi.fn(async () => ({
      token: 'abc',
      url: 'https://example.com/share/abc'
    }));

    const url = await buildShareUrl({
      activeTitle: 'Readme',
      cloudEnabled: true,
      createCloudShare,
      locationRef: {
        href: 'https://example.com/editor',
        origin: 'https://example.com',
        pathname: '/editor'
      },
      markdown: '# Hello',
      mode: 'edit'
    });

    expect(url).toBe('https://example.com/share/abc');
    expect(createCloudShare).toHaveBeenCalledWith({
      content: '# Hello',
      mode: 'edit',
      title: 'Readme'
    });
  });

  it('falls back to the default share title when the active title is missing', async () => {
    const createCloudShare = vi.fn(async () => ({
      token: 'abc',
      url: 'https://example.com/share/abc'
    }));

    await buildShareUrl({
      activeTitle: '',
      cloudEnabled: true,
      createCloudShare,
      locationRef: {
        href: 'https://example.com/editor',
        origin: 'https://example.com',
        pathname: '/editor'
      },
      markdown: '# Hello',
      mode: 'view'
    });

    expect(createCloudShare).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Shared document'
    }));
  });

  it('builds compressed hash URLs from the current origin and pathname', async () => {
    const url = await buildShareUrl({
      cloudEnabled: false,
      encodeMarkdown: () => 'encoded-content',
      locationRef: {
        href: 'https://example.com/editor?x=1#old',
        origin: 'https://example.com',
        pathname: '/editor'
      },
      markdown: '# Hello',
      mode: 'edit'
    });

    expect(url).toBe('https://example.com/editor#share=encoded-content&edit=1');
  });

  it('builds file-origin hash URLs from href without the old hash', async () => {
    expect(getShareBaseUrl({
      href: 'file:///C:/app/index.html#old',
      origin: 'null',
      pathname: '/C:/app/index.html'
    })).toBe('file:///C:/app/index.html');
  });

  it('returns null and logs when local encoding fails', async () => {
    const consoleRef = {
      error: vi.fn()
    };

    const url = await buildShareUrl({
      cloudEnabled: false,
      consoleRef,
      encodeMarkdown: () => {
        throw new Error('encoding failed');
      },
      locationRef: {
        href: 'https://example.com/editor',
        origin: 'https://example.com',
        pathname: '/editor'
      },
      markdown: '# Hello',
      mode: 'view'
    });

    expect(url).toBeNull();
    expect(consoleRef.error).toHaveBeenCalledWith('Share encoding failed:', expect.any(Error));
  });

  it('flags only oversized local share URLs', () => {
    const oversizedUrl = 'x'.repeat(MAX_SHARE_URL_LENGTH + 1);

    expect(isShareUrlTooLarge(oversizedUrl, false)).toBe(true);
    expect(isShareUrlTooLarge(oversizedUrl, true)).toBe(false);
    expect(isShareUrlTooLarge('x'.repeat(MAX_SHARE_URL_LENGTH), false)).toBe(false);
  });

  it('normalizes document titles', () => {
    expect(getShareDocumentTitle('Doc')).toBe('Doc');
    expect(getShareDocumentTitle('')).toBe('Shared document');
    expect(getShareDocumentTitle(null)).toBe('Shared document');
  });

  it('parses local share hashes and optional edit mode', () => {
    expect(parseShareHash('#share=encoded-content')).toEqual({
      encoded: 'encoded-content',
      mode: 'view'
    });
    expect(parseShareHash('#share=encoded-content&edit=1')).toEqual({
      encoded: 'encoded-content',
      mode: 'edit'
    });
    expect(parseShareHash('#share=encoded-content&foo=1&edit=1')).toEqual({
      encoded: 'encoded-content',
      mode: 'edit'
    });
  });

  it('ignores missing, empty, and unrelated hashes', () => {
    expect(parseShareHash('')).toBeNull();
    expect(parseShareHash('#section')).toBeNull();
    expect(parseShareHash('#share=')).toBeNull();
    expect(parseShareHash('#share=&edit=1')).toBeNull();
  });

  it('extracts cloud share tokens from share routes only', () => {
    expect(getCloudShareTokenFromPathname('/share/smoke-token')).toBe('smoke-token');
    expect(getCloudShareTokenFromPathname('/share/smoke-token/')).toBe('smoke-token');
    expect(getCloudShareTokenFromPathname('/share')).toBeNull();
    expect(getCloudShareTokenFromPathname('/editor/share/token')).toBeNull();
  });

  it('derives cloud share mode from response mode or query override', () => {
    expect(getCloudShareMode({ responseMode: 'edit', search: '' })).toBe('edit');
    expect(getCloudShareMode({ responseMode: 'view', search: '?edit=1' })).toBe('edit');
    expect(getCloudShareMode({ responseMode: 'view', search: '?edit=0' })).toBe('view');
    expect(getCloudShareMode({ responseMode: undefined, search: '' })).toBe('view');
  });

  it('maps share modes to preserved view modes', () => {
    expect(getShareViewMode('edit')).toBe('split');
    expect(getShareViewMode('view')).toBe('preview');
  });

  it('prepares cloud share documents with fallback title, content, and mode override', () => {
    expect(prepareCloudShareDocument({
      responseData: {
        content: '# Shared',
        mode: 'view',
        title: 'Cloud doc'
      },
      search: '?edit=1'
    })).toEqual({
      content: '# Shared',
      title: 'Cloud doc',
      viewMode: 'split'
    });

    expect(prepareCloudShareDocument({
      responseData: {
        content: null,
        mode: 'view',
        title: ''
      },
      search: ''
    })).toEqual({
      content: '',
      title: 'Shared document',
      viewMode: 'preview'
    });
  });

  it('prepares local share hash documents through the supplied decoder', () => {
    expect(prepareLocalShareDocument('#share=encoded-content&edit=1', (encoded) => `decoded:${encoded}`)).toEqual({
      content: 'decoded:encoded-content',
      viewMode: 'split'
    });
    expect(prepareLocalShareDocument('#section', (encoded) => encoded)).toBeNull();
  });
});
