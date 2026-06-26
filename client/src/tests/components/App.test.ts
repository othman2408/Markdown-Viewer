// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

const appMocks = vi.hoisted(() => ({
  startMarkdownViewerApp: vi.fn(async () => {})
}));

vi.mock('../../lib/app/markdownViewerApp', () => ({
  startMarkdownViewerApp: appMocks.startMarkdownViewerApp
}));

import App from '../../App.svelte';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {})
    }
  });
}

describe('App shell auth gate', () => {
  afterEach(() => {
    cleanup();
    appMocks.startMarkdownViewerApp.mockClear();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('holds the editor shell while session status is pending', () => {
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const { container } = render(App);

    expect(container.querySelector('.app-boot-screen')).not.toBeNull();
    expect(container.querySelector('#markdown-editor')).toBeNull();
    expect(appMocks.startMarkdownViewerApp).not.toHaveBeenCalled();
  });

  it('renders and starts the editor after an authenticated session check', async () => {
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ authenticated: true })));

    const { container } = render(App);

    await waitFor(() => {
      expect(appMocks.startMarkdownViewerApp).toHaveBeenCalledOnce();
    });
    expect(container.querySelector('.app-container')).not.toBeNull();
    expect(container.querySelector('#markdown-editor')).not.toBeNull();
  });

  it('renders public share routes without checking the auth session', async () => {
    window.history.replaceState({}, '', '/share/smoke-token');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    const { container } = render(App);

    await waitFor(() => {
      expect(appMocks.startMarkdownViewerApp).toHaveBeenCalledOnce();
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(container.querySelector('.app-container')).not.toBeNull();
  });
});
