import { describe, expect, it, vi } from 'vitest';
import type { WorkspacePayload } from '../../../lib/types/workspace';
import {
  ACTIVE_TAB_KEY,
  FIND_REPLACE_DOCKED_KEY,
  GLOBAL_STATE_KEY,
  STORAGE_KEY,
  UNTITLED_COUNTER_KEY
} from '../../../lib/config/appConfig';
import { createCloudWorkspace } from '../../../lib/cloud/workspace';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {})
    }
  });
}

const workspacePayload: WorkspacePayload = {
  tabs: [],
  activeTabId: null,
  untitledCounter: 0,
  globalState: {},
  findReplaceDocked: false
};

const browserLocation = {
  pathname: '/',
  protocol: 'https:',
  search: '',
  hash: ''
};

describe('cloud workspace', () => {
  it('bootstraps the cloud workspace snapshot from the API', async () => {
    const remoteTab = {
      id: 'tab_remote',
      title: 'Remote',
      content: '# Remote',
      scrollPos: 0,
      viewMode: 'split',
      createdAt: 1
    };
    const syncCloudState = vi.fn();
    const cloud = createCloudWorkspace({
      getWorkspacePayload: () => workspacePayload,
      location: browserLocation,
      syncCloudState,
      fetcher: vi.fn(async () => jsonResponse({
        csrfToken: 'csrf-token',
        tabs: [remoteTab],
        activeTabId: 'tab_remote',
        untitledCounter: 4,
        globalState: { theme: 'dark' },
        findReplaceDocked: true
      })) as never
    });

    await cloud.init();

    expect(cloud.state.enabled).toBe(true);
    expect(cloud.state.csrfToken).toBe('csrf-token');
    expect(JSON.parse(cloud.readStorageItem(STORAGE_KEY) || '[]')[0].title).toBe('Remote');
    expect(JSON.parse(cloud.readStorageItem(GLOBAL_STATE_KEY) || '{}').theme).toBe('dark');
    expect(cloud.readStorageItem(ACTIVE_TAB_KEY)).toBe('tab_remote');
    expect(cloud.readStorageItem(UNTITLED_COUNTER_KEY)).toBe('4');
    expect(cloud.readStorageItem(FIND_REPLACE_DOCKED_KEY)).toBe('true');
    expect(syncCloudState).toHaveBeenCalledWith(expect.objectContaining({
      enabled: true,
      csrfToken: 'csrf-token'
    }));
  });

  it('adds CSRF headers without forcing JSON content type for FormData uploads', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ url: '/assets/image.png' }));
    const cloud = createCloudWorkspace({
      getWorkspacePayload: () => workspacePayload,
      location: browserLocation,
      fetcher: fetcher as never
    });
    cloud.state.enabled = true;
    cloud.state.csrfToken = 'csrf-token';

    const formData = new FormData();
    formData.append('file', new Blob(['image']), 'image.png');
    await cloud.api('/api/assets', {
      method: 'POST',
      body: formData
    });

    const request = (fetcher.mock.calls[0] as [RequestInfo | URL, RequestInit])[1];
    const headers = request.headers as Record<string, string>;
    expect(headers['X-CSRF-Token']).toBe('csrf-token');
    expect(headers.Accept).toBe('application/json');
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('queues a retry when workspace save hits a network fetch failure', async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const setTimer = vi.fn();
    const warn = vi.fn();
    const cloud = createCloudWorkspace({
      getWorkspacePayload: () => workspacePayload,
      location: browserLocation,
      fetcher: fetcher as never,
      setTimer: setTimer as never,
      consoleRef: { warn }
    });
    cloud.state.enabled = true;
    cloud.state.csrfToken = 'csrf-token';

    await cloud.flushWorkspaceSave();

    expect(fetcher).toHaveBeenCalledWith('/api/workspace', expect.objectContaining({
      method: 'PUT'
    }));
    expect(cloud.state.saveQueued).toBe(true);
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 1500);
    expect(warn).toHaveBeenCalledWith(
      'Cloud workspace save failed; retrying when the backend is reachable:',
      expect.any(TypeError)
    );
  });

  it('clears the in-memory cloud workspace snapshot', () => {
    const cloud = createCloudWorkspace({
      getWorkspacePayload: () => workspacePayload,
      location: browserLocation
    });
    cloud.saveStorageItem(GLOBAL_STATE_KEY, '{}');
    cloud.state.items[STORAGE_KEY] = '[]';
    cloud.saveStorageItem(ACTIVE_TAB_KEY, 'tab_1');
    cloud.saveStorageItem(UNTITLED_COUNTER_KEY, '2');
    cloud.saveStorageItem(FIND_REPLACE_DOCKED_KEY, 'false');

    cloud.clearWorkspaceSnapshot();

    expect(cloud.readStorageItem(GLOBAL_STATE_KEY)).toBeNull();
    expect(cloud.readStorageItem(STORAGE_KEY)).toBeNull();
    expect(cloud.readStorageItem(ACTIVE_TAB_KEY)).toBeNull();
    expect(cloud.state.items[STORAGE_KEY]).toBeUndefined();
  });

  it('detects cloud share pages from the current location', () => {
    const cloud = createCloudWorkspace({
      getWorkspacePayload: () => workspacePayload,
      location: {
        pathname: '/share/smoke-token',
        protocol: 'https:',
        search: '',
        hash: ''
      }
    });

    expect(cloud.isCloudSharePage()).toBe(true);
    expect(cloud.shouldUseCloudStorage()).toBe(false);
  });
});
