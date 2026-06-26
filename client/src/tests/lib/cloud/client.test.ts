import { describe, expect, it, vi } from 'vitest';
import { AuthRequiredError, createCloudClient } from '../../../lib/cloud/client';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {})
    }
  });
}

describe('cloud client', () => {
  it('sends JSON workspace saves with CSRF headers', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true }));
    const client = createCloudClient({
      fetcher: fetcher as never,
      getCsrfToken: () => 'csrf-token'
    });

    await client.saveWorkspace({
      tabs: [],
      activeTabId: null,
      untitledCounter: 0,
      globalState: {},
      findReplaceDocked: false
    });

    expect(fetcher).toHaveBeenCalledWith('/api/workspace', expect.objectContaining({
      method: 'PUT',
      credentials: 'same-origin',
      body: JSON.stringify({
        tabs: [],
        activeTabId: null,
        untitledCounter: 0,
        globalState: {},
        findReplaceDocked: false
      })
    }));
    const call = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const headers = call[1].headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token');
  });

  it('reports auth-required responses through the callback', async () => {
    const onAuthRequired = vi.fn();
    const client = createCloudClient({
      fetcher: vi.fn(async () => new Response('', { status: 401 })) as never,
      onAuthRequired
    });

    await expect(client.bootstrap()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(onAuthRequired).toHaveBeenCalledOnce();
  });
});
