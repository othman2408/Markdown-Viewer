// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AuthLoginPage from '../../../components/auth/AuthLoginPage.svelte';

describe('AuthLoginPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });

  it('renders the form post contract and error state from query params', () => {
    window.history.replaceState({}, '', '/login?returnTo=/notes%3Ftab%3D1&error=1');

    const { container } = render(AuthLoginPage);
    const form = container.querySelector<HTMLFormElement>('form.auth-form');
    const returnTo = container.querySelector<HTMLInputElement>('input[name="returnTo"]');
    const email = container.querySelector<HTMLInputElement>('#email');
    const password = container.querySelector<HTMLInputElement>('#password');
    const error = container.querySelector<HTMLDivElement>('#login-error');

    expect(container.querySelector('#login-title')?.textContent).toBe('Sign in');
    expect(form?.getAttribute('method')).toBe('post');
    expect(form?.getAttribute('action')).toBe('/api/login');
    expect(form?.getAttribute('aria-describedby')).toBe('login-error');
    expect(returnTo?.value).toBe('/notes?tab=1');
    expect(email?.getAttribute('autocomplete')).toBe('username');
    expect(password?.getAttribute('autocomplete')).toBe('current-password');
    expect(password?.getAttribute('placeholder')).toBe('Enter password');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toBe('Invalid email or password.');
  });

  it('sanitizes unsafe return targets before submitting them', () => {
    window.history.replaceState({}, '', '/login?returnTo=https://example.com');

    const { container } = render(AuthLoginPage);

    expect(container.querySelector<HTMLInputElement>('input[name="returnTo"]')?.value).toBe('/');
    expect(container.querySelector('#login-error')).toBeNull();
  });

  it('uses fetch login when a SPA success handler is provided', async () => {
    window.history.replaceState({}, '', '/login?returnTo=/notes%3Ftab%3D1');
    const onLoginSuccess = vi.fn();
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      return new Response(JSON.stringify({ ok: true, csrfToken: 'csrf' }), {
        headers: { 'content-type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetcher);

    const { container } = render(AuthLoginPage, {
      props: { onLoginSuccess }
    });
    const form = container.querySelector<HTMLFormElement>('form.auth-form');

    await fireEvent.input(container.querySelector<HTMLInputElement>('#email')!, {
      target: { value: 'admin@example.com' }
    });
    await fireEvent.input(container.querySelector<HTMLInputElement>('#password')!, {
      target: { value: 'secret' }
    });
    await fireEvent.submit(form!);

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith('/notes?tab=1');
    });
    expect(fetcher).toHaveBeenCalledWith('/api/login', expect.objectContaining({
      credentials: 'same-origin',
      method: 'POST'
    }));
    const requestInit = fetcher.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      email: 'admin@example.com',
      password: 'secret',
      returnTo: '/notes?tab=1'
    });
  });
});
