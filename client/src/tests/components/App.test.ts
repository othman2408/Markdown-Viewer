// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

const appMocks = vi.hoisted(() => {
  const state = {
    lastOptions: null as null | { onLogout?: () => void | Promise<void> }
  };
  const runtime = {
    destroy: vi.fn()
  };

  return {
    runtime,
    state,
    startMarkdownViewerApp: vi.fn(async (options?: { onLogout?: () => void | Promise<void> }) => {
      state.lastOptions = options || null;
      return runtime;
    })
  };
});

vi.mock('../../lib/app/markdownViewerApp', () => ({
  startMarkdownViewerApp: appMocks.startMarkdownViewerApp
}));

import App from '../../App.svelte';

function createAnimationMock(): Animation {
  let onfinish: Animation['onfinish'] = null;
  const animation = {
    currentTime: 0,
    effect: null,
    playState: 'running',
    cancel: vi.fn(() => {
      animation.playState = 'idle';
    }),
    get onfinish() {
      return onfinish;
    },
    set onfinish(handler) {
      onfinish = handler;
      if (handler) {
        queueMicrotask(() => {
          animation.playState = 'finished';
          handler.call(animation as unknown as Animation, new Event('finish') as AnimationPlaybackEvent);
        });
      }
    }
  };

  return animation as unknown as Animation;
}

function installAnimationMock(): void {
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: vi.fn(() => createAnimationMock())
  });
}

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
    appMocks.runtime.destroy.mockClear();
    appMocks.state.lastOptions = null;
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('holds the editor shell while session status is pending', () => {
    installAnimationMock();
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    const { container } = render(App);

    expect(container.querySelector('.app-boot-screen')).not.toBeNull();
    expect(container.querySelector('[data-page-state="checking"]')).not.toBeNull();
    expect(container.querySelector('#markdown-editor')).toBeNull();
    expect(appMocks.startMarkdownViewerApp).not.toHaveBeenCalled();
  });

  it('renders and starts the editor after an authenticated session check', async () => {
    installAnimationMock();
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ authenticated: true })));

    const { container } = render(App);

    await waitFor(() => {
      expect(appMocks.startMarkdownViewerApp).toHaveBeenCalledOnce();
    });
    expect(appMocks.state.lastOptions?.onLogout).toBeTypeOf('function');
    expect(container.querySelector('[data-page-state="ready"]')).not.toBeNull();
    expect(container.querySelector('.app-container')).not.toBeNull();
    expect(container.querySelector('#markdown-editor')).not.toBeNull();
  });

  it('renders public share routes without checking the auth session', async () => {
    installAnimationMock();
    window.history.replaceState({}, '', '/share/smoke-token');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    const { container } = render(App);

    await waitFor(() => {
      expect(appMocks.startMarkdownViewerApp).toHaveBeenCalledOnce();
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(container.querySelector('[data-page-state="ready"]')).not.toBeNull();
    expect(container.querySelector('.app-container')).not.toBeNull();
  });

  it('submits login without a document reload and starts the editor route', async () => {
    installAnimationMock();
    window.history.replaceState({}, '', '/login?returnTo=/notes%3Ftab%3D1');
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return jsonResponse({ ok: true, csrfToken: 'csrf' });
    });
    vi.stubGlobal('fetch', fetcher);

    const { container } = render(App);
    const form = container.querySelector<HTMLFormElement>('form.auth-form');
    const email = container.querySelector<HTMLInputElement>('#email');
    const password = container.querySelector<HTMLInputElement>('#password');

    expect(form).not.toBeNull();
    await fireEvent.input(email!, { target: { value: 'admin@example.com' } });
    await fireEvent.input(password!, { target: { value: 'secret' } });
    await fireEvent.submit(form!);

    await waitFor(() => {
      expect(appMocks.startMarkdownViewerApp).toHaveBeenCalledOnce();
    });
    expect(fetcher).toHaveBeenCalledWith('/api/login', expect.objectContaining({
      credentials: 'same-origin',
      method: 'POST'
    }));
    const requestInit = fetcher.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(requestInit.body));
    expect(body).toMatchObject({
      email: 'admin@example.com',
      password: 'secret',
      returnTo: '/notes?tab=1'
    });
    expect(window.location.pathname).toBe('/notes');
    expect(window.location.search).toBe('?tab=1');
    expect(container.querySelector('[data-page-state="ready"]')).not.toBeNull();
  });

  it('uses the runtime logout callback to return to login without reloading', async () => {
    installAnimationMock();
    window.history.replaceState({}, '', '/');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ authenticated: true })));

    const { container } = render(App);

    await waitFor(() => {
      expect(appMocks.startMarkdownViewerApp).toHaveBeenCalledOnce();
    });
    await Promise.resolve();
    await Promise.resolve();
    await appMocks.state.lastOptions?.onLogout?.();

    await waitFor(() => {
      expect(container.querySelector('[data-page-state="login"]')).not.toBeNull();
    });
    expect(appMocks.runtime.destroy).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe('/login');
  });
});
