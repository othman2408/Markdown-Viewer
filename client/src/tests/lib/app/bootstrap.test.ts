// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MARKDOWN_DOCUMENT,
  initializeCoreLibraryRuntime,
  initializeGlobalPreferencesRuntime,
  initializeWorkspaceRuntime,
  readDefaultMarkdownDocument
} from '../../../lib/app/bootstrap';

describe('app bootstrap helpers', () => {
  it('loads core libraries and returns the loader runtime', async () => {
    const loader = {
      CDN: {},
      ensureCoreLibraries: vi.fn().mockResolvedValue(undefined),
      loadScript: vi.fn(),
      loadStyle: vi.fn()
    };

    const runtime = await initializeCoreLibraryRuntime({
      createLoader: () => loader as never
    });

    expect(runtime).toBe(loader);
    expect(loader.ensureCoreLibraries).toHaveBeenCalledOnce();
  });

  it('alerts and returns null when required libraries fail', async () => {
    const error = new Error('load failed');
    const alertFn = vi.fn();
    const consoleRef = { error: vi.fn() };

    const runtime = await initializeCoreLibraryRuntime({
      alertFn,
      consoleRef,
      createLoader: () => ({
        CDN: {},
        ensureCoreLibraries: vi.fn().mockRejectedValue(error),
        loadScript: vi.fn(),
        loadStyle: vi.fn()
      }) as never
    });

    expect(runtime).toBeNull();
    expect(consoleRef.error).toHaveBeenCalledWith('Failed to load required libraries:', error);
    expect(alertFn).toHaveBeenCalledWith('Failed to load required editor libraries. Please refresh and try again.');
  });

  it('initializes cloud workspace and tab persistence runtime', async () => {
    const cloudWorkspace = {
      api: vi.fn(),
      clearWorkspaceSnapshot: vi.fn(),
      flushWorkspaceSave: vi.fn(),
      init: vi.fn().mockResolvedValue(undefined),
      isCloudSharePage: vi.fn(),
      readStorageItem: vi.fn(),
      saveStorageItem: vi.fn(),
      scheduleWorkspaceSave: vi.fn(),
      shouldUseCloudStorage: vi.fn(),
      state: {
        csrfToken: null,
        enabled: false,
        items: {},
        saveInFlight: false,
        saveQueued: false,
        saveTimer: null,
        shareRequestSeq: 0
      },
      syncCloudStateSnapshot: vi.fn()
    };
    const workspaceStorage = {
      loadActiveTabId: vi.fn(),
      loadTabs: vi.fn(),
      loadUntitledCounter: vi.fn(),
      saveActiveTabId: vi.fn(),
      saveTabs: vi.fn(),
      saveUntitledCounter: vi.fn()
    };

    const runtime = await initializeWorkspaceRuntime({
      cloudWorkspaceFactory: () => cloudWorkspace as never,
      getWorkspacePayload: () => ({
        activeTabId: null,
        findReplaceDocked: false,
        globalState: {},
        tabs: [],
        untitledCounter: 0
      }),
      workspaceStorageFactory: (options) => {
        expect(options.keys).toMatchObject({
          activeTabId: 'markdownViewerActiveTab',
          tabs: 'markdownViewerTabs',
          untitledCounter: 'markdownViewerUntitledCounter'
        });
        expect(options.readStorageItem).toBe(cloudWorkspace.readStorageItem);
        expect(options.saveStorageItem).toBe(cloudWorkspace.saveStorageItem);
        return workspaceStorage;
      }
    });

    expect(cloudWorkspace.init).toHaveBeenCalledOnce();
    expect(runtime.cloudWorkspace).toBe(cloudWorkspace);
    expect(runtime.workspaceStorage).toBe(workspaceStorage);
    expect(runtime.readStorageItem).toBe(cloudWorkspace.readStorageItem);
  });

  it('initializes persisted theme and content direction', () => {
    const stored = new Map<string, string>([
      ['markdownViewerGlobalState', JSON.stringify({ direction: 'rtl', theme: 'dark' })]
    ]);
    const syncEditorState = vi.fn();
    const syncUiState = vi.fn();
    const syncWorkspaceState = vi.fn();
    const runtime = initializeGlobalPreferencesRuntime({
      readStorageItem: (key) => stored.get(key) ?? null,
      saveStorageItem: (key, value) => stored.set(key, value),
      syncEditorState,
      syncUiState,
      syncWorkspaceState,
      windowRef: {
        matchMedia: () => ({ matches: false })
      }
    });

    expect(runtime.initialTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(syncUiState).toHaveBeenCalledWith({ theme: 'dark' });
    expect(syncEditorState).toHaveBeenCalledWith({ direction: 'rtl' });

    runtime.contentDirectionController.toggle();

    expect(JSON.parse(stored.get('markdownViewerGlobalState') || '{}')).toMatchObject({
      direction: 'ltr',
      theme: 'dark'
    });
    expect(syncWorkspaceState).toHaveBeenCalledOnce();
  });

  it('reads the default markdown template and falls back to the inline document', () => {
    document.body.innerHTML = `
      <template id="default-markdown">
        # From Template
      </template>
    `;

    expect(readDefaultMarkdownDocument()).toBe('# From Template');

    document.body.innerHTML = '';

    expect(readDefaultMarkdownDocument()).toBe(DEFAULT_MARKDOWN_DOCUMENT);
  });
});
