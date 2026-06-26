// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createWorkspacePersistenceRuntime } from '../../../lib/app/workspacePersistence';
import type { DocumentTab } from '../../../lib/types/workspace';

function createTab(id: string): DocumentTab {
  return {
    content: `# ${id}`,
    createdAt: 1,
    id,
    scrollPos: 0,
    title: id,
    viewMode: 'split'
  };
}

describe('workspace persistence runtime', () => {
  it('loads and saves active tab metadata through storage and syncs Svelte state', () => {
    const tabs = [createTab('tab-1')];
    const syncWorkspaceState = vi.fn();
    const storage = {
      loadActiveTabId: vi.fn(() => 'tab-1'),
      loadTabs: vi.fn(() => tabs),
      loadUntitledCounter: vi.fn(() => 3),
      saveActiveTabId: vi.fn(),
      saveTabs: vi.fn(),
      saveUntitledCounter: vi.fn()
    };

    const runtime = createWorkspacePersistenceRuntime({
      captureActiveTabState: vi.fn(),
      cloudStorage: { enabled: false, saveTimer: null },
      flushCloudWorkspaceSave: vi.fn(),
      getTabs: () => tabs,
      syncWorkspaceState,
      workspaceStorage: storage
    });

    expect(runtime.loadTabsFromStorage()).toBe(tabs);
    expect(runtime.loadActiveTabId()).toBe('tab-1');
    expect(runtime.loadUntitledCounter()).toBe(3);

    runtime.saveActiveTabId('tab-2');
    runtime.saveUntitledCounter(4);

    expect(storage.saveActiveTabId).toHaveBeenCalledWith('tab-2');
    expect(storage.saveUntitledCounter).toHaveBeenCalledWith(4);
    expect(syncWorkspaceState).toHaveBeenCalledTimes(2);
  });

  it('flushes current tabs on lifecycle events', () => {
    const tabs = [createTab('tab-1')];
    const captureActiveTabState = vi.fn();
    const storage = {
      loadActiveTabId: vi.fn(),
      loadTabs: vi.fn(),
      loadUntitledCounter: vi.fn(),
      saveActiveTabId: vi.fn(),
      saveTabs: vi.fn(),
      saveUntitledCounter: vi.fn()
    };
    const windowListeners = new Map<string, () => void>();
    const documentListeners = new Map<string, () => void>();
    const windowRef = {
      addEventListener: vi.fn((type: string, listener: () => void) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: vi.fn()
    } as unknown as Window;
    const documentRef = {
      addEventListener: vi.fn((type: string, listener: () => void) => {
        documentListeners.set(type, listener);
      }),
      removeEventListener: vi.fn(),
      visibilityState: 'hidden'
    } as unknown as Document;

    createWorkspacePersistenceRuntime({
      captureActiveTabState,
      cloudStorage: { enabled: false, saveTimer: null },
      documentRef,
      flushCloudWorkspaceSave: vi.fn(),
      getTabs: () => tabs,
      syncWorkspaceState: vi.fn(),
      windowRef,
      workspaceStorage: storage
    });

    windowListeners.get('beforeunload')?.();
    documentListeners.get('visibilitychange')?.();

    expect(captureActiveTabState).toHaveBeenCalledTimes(2);
    expect(storage.saveTabs).toHaveBeenCalledTimes(2);
    expect(storage.saveTabs).toHaveBeenCalledWith(tabs);
  });
});
