import { syncCloudState as defaultSyncCloudState } from '../state/stateBridge';
import type { CloudStateSnapshot } from '../state/cloud.svelte';
import type { WorkspaceBootstrap, WorkspacePayload } from '../types/workspace';
import {
  ACTIVE_TAB_KEY,
  FIND_REPLACE_DOCKED_KEY,
  GLOBAL_STATE_KEY,
  STORAGE_KEY,
  UNTITLED_COUNTER_KEY
} from '../config/appConfig';

type TimerHandle = ReturnType<typeof setTimeout>;

type CloudWorkspaceState = {
  enabled: boolean;
  csrfToken: string | null;
  items: Record<string, string>;
  saveInFlight: boolean;
  saveQueued: boolean;
  saveTimer: TimerHandle | null;
  shareRequestSeq: number;
};

type CloudWorkspaceOptions = {
  getWorkspacePayload(): WorkspacePayload;
  syncCloudState?: (patch: Partial<CloudStateSnapshot>) => void;
  fetcher?: typeof fetch;
  location?: Pick<Location, 'pathname' | 'protocol' | 'search' | 'hash'>;
  redirectTo?: (url: string) => void;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  consoleRef?: Pick<Console, 'warn'>;
};

const WORKSPACE_STORAGE_KEYS = [
  GLOBAL_STATE_KEY,
  STORAGE_KEY,
  ACTIVE_TAB_KEY,
  UNTITLED_COUNTER_KEY,
  FIND_REPLACE_DOCKED_KEY
] as const;

function createInitialState(): CloudWorkspaceState {
  return {
    enabled: false,
    csrfToken: null,
    items: {},
    saveInFlight: false,
    saveQueued: false,
    saveTimer: null,
    shareRequestSeq: 0
  };
}

function getRuntimeLocation(): Pick<Location, 'pathname' | 'protocol' | 'search' | 'hash'> {
  return window.location;
}

function createAuthRedirect(locationRef: Pick<Location, 'pathname' | 'search' | 'hash'>): (url: string) => void {
  return (url: string) => {
    window.location.href = url;
  };
}

function isJsonRequestBody(body: BodyInit | null | undefined): boolean {
  return Boolean(body) && !(typeof FormData !== 'undefined' && body instanceof FormData);
}

export function createCloudWorkspace(options: CloudWorkspaceOptions) {
  const state = createInitialState();
  const locationRef = options.location ?? getRuntimeLocation();
  const fetcher = options.fetcher ?? fetch.bind(globalThis);
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const consoleRef = options.consoleRef ?? console;
  const syncCloudState = options.syncCloudState ?? defaultSyncCloudState;
  const redirectTo = options.redirectTo ?? createAuthRedirect(locationRef);

  function syncCloudStateSnapshot(): void {
    syncCloudState({
      enabled: state.enabled,
      csrfToken: state.csrfToken,
      saveInFlight: state.saveInFlight,
      saveQueued: state.saveQueued,
      shareRequestSeq: state.shareRequestSeq
    });
  }

  function isCloudSharePage(): boolean {
    return /^\/share\/[^/]+/.test(locationRef.pathname);
  }

  function shouldUseCloudStorage(): boolean {
    return locationRef.protocol !== 'file:' &&
      !isCloudSharePage();
  }

  function readStorageItem(key: string): string | null {
    if (state.enabled && Object.prototype.hasOwnProperty.call(state.items, key)) {
      return state.items[key];
    }
    return null;
  }

  function setCloudWorkspaceSnapshot(data: Partial<WorkspaceBootstrap>): void {
    state.items[GLOBAL_STATE_KEY] = JSON.stringify(data.globalState || {});
    state.items[STORAGE_KEY] = JSON.stringify(data.tabs || []);
    state.items[ACTIVE_TAB_KEY] = data.activeTabId || '';
    state.items[UNTITLED_COUNTER_KEY] = String(data.untitledCounter || 0);
    state.items[FIND_REPLACE_DOCKED_KEY] = data.findReplaceDocked ? 'true' : 'false';
  }

  async function api(path: string, requestOptions: RequestInit = {}): Promise<any> {
    const headers = (requestOptions.headers || {}) as Record<string, string>;
    headers.Accept = headers.Accept || 'application/json';
    if (isJsonRequestBody(requestOptions.body) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes((requestOptions.method || 'GET').toUpperCase())) {
      headers['X-CSRF-Token'] = state.csrfToken || '';
    }
    const response = await fetcher(path, {
      ...requestOptions,
      headers,
      credentials: 'same-origin'
    });
    if (response.status === 401 && shouldUseCloudStorage()) {
      redirectTo('/login?returnTo=' + encodeURIComponent(locationRef.pathname + locationRef.search + locationRef.hash));
      return new Promise<never>(() => {});
    }
    if (!response.ok) {
      let message = 'Request failed';
      try {
        const errorBody = await response.json();
        message = errorBody.error || message;
      } catch (_) {}
      throw new Error(message);
    }
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json') ? response.json() : response.text();
  }

  async function init(): Promise<void> {
    if (!shouldUseCloudStorage()) return;
    try {
      const data = await api('/api/bootstrap');
      state.enabled = true;
      state.csrfToken = data.csrfToken;
      syncCloudStateSnapshot();

      setCloudWorkspaceSnapshot(data);
    } catch (error) {
      if (error && (error as Error).message !== 'auth_required') {
        consoleRef.warn('Cloud storage bootstrap failed:', error);
      }
    }
  }

  function scheduleWorkspaceSave(delay?: number): void {
    if (!state.enabled) return;
    if (state.saveTimer) clearTimer(state.saveTimer);
    state.saveTimer = setTimer(flushWorkspaceSave, delay === undefined ? 700 : delay);
  }

  async function flushWorkspaceSave(): Promise<void> {
    if (!state.enabled) return;
    if (state.saveInFlight) {
      state.saveQueued = true;
      syncCloudStateSnapshot();
      return;
    }
    state.saveInFlight = true;
    state.saveQueued = false;
    syncCloudStateSnapshot();
    try {
      await api('/api/workspace', {
        method: 'PUT',
        body: JSON.stringify(options.getWorkspacePayload())
      });
    } catch (error) {
      consoleRef.warn('Cloud workspace save failed:', error);
    } finally {
      state.saveInFlight = false;
      syncCloudStateSnapshot();
      if (state.saveQueued) scheduleWorkspaceSave(50);
    }
  }

  function saveStorageItem(key: string, value: string): void {
    state.items[key] = value;
    if (state.enabled) {
      scheduleWorkspaceSave();
    }
  }

  function clearWorkspaceSnapshot(): void {
    WORKSPACE_STORAGE_KEYS.forEach((key) => {
      delete state.items[key];
    });
  }

  return {
    state,
    api,
    clearWorkspaceSnapshot,
    flushWorkspaceSave,
    init,
    isCloudSharePage,
    readStorageItem,
    saveStorageItem,
    scheduleWorkspaceSave,
    shouldUseCloudStorage,
    syncCloudStateSnapshot
  };
}
