import type { CloudClient } from '../types/cloud';
import type { WorkspacePayload } from '../types/workspace';

export interface CloudClientOptions {
  fetcher?: typeof fetch;
  getCsrfToken?: () => string | null;
  onAuthRequired?: () => void;
}

export class AuthRequiredError extends Error {
  constructor() {
    super('auth_required');
    this.name = 'AuthRequiredError';
  }
}

export function createCloudClient(options: CloudClientOptions = {}): CloudClient {
  const fetcher = options.fetcher || fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', headers.get('Accept') || 'application/json');

    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const method = (init.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      headers.set('X-CSRF-Token', options.getCsrfToken?.() || '');
    }

    const response = await fetcher(path, {
      ...init,
      headers,
      credentials: 'same-origin'
    });

    if (response.status === 401) {
      options.onAuthRequired?.();
      throw new AuthRequiredError();
    }

    if (!response.ok) {
      let message = 'Request failed';
      try {
        const body = await response.json();
        message = body.error || message;
      } catch (_) {
        // Keep generic message when the response is not JSON.
      }
      throw new Error(message);
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json')
      ? response.json() as Promise<T>
      : response.text() as Promise<T>;
  }

  return {
    bootstrap() {
      return request('/api/bootstrap');
    },
    saveWorkspace(payload: WorkspacePayload) {
      return request('/api/workspace', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    },
    createShare(input) {
      return request('/api/shares', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    },
    uploadAsset(file) {
      const body = new FormData();
      body.set('file', file);
      return request('/api/assets', {
        method: 'POST',
        body
      });
    },
    logout() {
      return request('/api/logout', { method: 'POST' });
    },
    getShare(token) {
      return request(`/api/shares/${encodeURIComponent(token)}`);
    }
  };
}
