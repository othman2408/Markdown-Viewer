// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createShareRuntime } from '../../../lib/app/shareRuntime';

describe('share runtime', () => {
  it('builds local share URLs from editor content and active title', async () => {
    const runtime = createShareRuntime({
      applyCloudSharedDocument: vi.fn(),
      applyLocalSharedDocument: vi.fn(),
      cloudStorage: { enabled: false, shareRequestSeq: 0 },
      createCloudShare: vi.fn(),
      getActiveTitle: () => 'Doc',
      getCompressionLib: () => ({
        deflate: (input: Uint8Array) => input,
        inflate: (input: Uint8Array) => input
      }),
      getMarkdown: () => '# Hello',
      isCloudSharePage: () => false,
      loadCompression: vi.fn(),
      locationRef: {
        hash: '',
        href: 'https://example.com/',
        origin: 'https://example.com',
        pathname: '/',
        search: ''
      },
      syncCloudStateSnapshot: vi.fn(),
      syncModalState: vi.fn()
    });

    const url = await runtime.buildShareUrl('view');

    expect(url).toContain('#share=');
    expect(url).not.toContain('edit=1');
  });

  it('loads cloud shared documents through the apply callback', async () => {
    const applyCloudSharedDocument = vi.fn();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: '# Cloud',
        title: 'Shared',
        viewMode: 'preview'
      })
    });
    const runtime = createShareRuntime({
      applyCloudSharedDocument,
      applyLocalSharedDocument: vi.fn(),
      cloudStorage: { enabled: true, shareRequestSeq: 0 },
      createCloudShare: vi.fn(),
      fetcher,
      getActiveTitle: () => null,
      getCompressionLib: () => undefined,
      getMarkdown: () => '',
      isCloudSharePage: () => true,
      loadCompression: vi.fn(),
      locationRef: {
        hash: '',
        href: 'https://example.com/share/token-1',
        origin: 'https://example.com',
        pathname: '/share/token-1',
        search: '?mode=preview'
      },
      syncCloudStateSnapshot: vi.fn(),
      syncModalState: vi.fn()
    });

    await runtime.loadFromCloudShare();

    expect(fetcher).toHaveBeenCalledWith('/api/shares/token-1', expect.any(Object));
    expect(applyCloudSharedDocument).toHaveBeenCalledWith(expect.objectContaining({
      content: '# Cloud',
      title: 'Shared',
      viewMode: 'preview'
    }));
  });
});
