import { describe, expect, it, vi } from 'vitest';
import { createDocumentTab } from '../../../lib/workspace/actions';
import { createWorkspaceStorage, parsePersistedCounter, parsePersistedTabs } from '../../../lib/workspace/persistence';

const keys = {
  tabs: 'tabs-key',
  activeTabId: 'active-key',
  untitledCounter: 'counter-key'
};

describe('workspace persistence', () => {
  it('parses persisted tabs with the same fallback behavior as stored workspace payloads', () => {
    const tab = createDocumentTab({ title: 'One', now: () => 1, random: () => 0.1 });

    expect(parsePersistedTabs(JSON.stringify([tab]))).toEqual([tab]);
    expect(parsePersistedTabs('{"not":"tabs"}')).toEqual([]);
    expect(parsePersistedTabs('bad json')).toEqual([]);
    expect(parsePersistedTabs(null)).toEqual([]);
  });

  it('parses the untitled counter defensively', () => {
    expect(parsePersistedCounter('4')).toBe(4);
    expect(parsePersistedCounter('bad')).toBe(0);
    expect(parsePersistedCounter(null)).toBe(0);
  });

  it('loads and saves workspace storage fields through injected storage hooks', () => {
    const tab = createDocumentTab({ title: 'Stored', now: () => 2, random: () => 0.2 });
    const values = new Map<string, string>([
      [keys.tabs, JSON.stringify([tab])],
      [keys.activeTabId, tab.id],
      [keys.untitledCounter, '7']
    ]);
    const readStorageItem = vi.fn((key: string) => values.get(key) ?? null);
    const saveStorageItem = vi.fn((key: string, value: string) => {
      values.set(key, value);
    });
    const storage = createWorkspaceStorage({ keys, readStorageItem, saveStorageItem });

    expect(storage.loadTabs()).toEqual([tab]);
    expect(storage.loadActiveTabId()).toBe(tab.id);
    expect(storage.loadUntitledCounter()).toBe(7);

    storage.saveTabs([]);
    storage.saveActiveTabId(null);
    storage.saveUntitledCounter(8);

    expect(saveStorageItem).toHaveBeenCalledWith(keys.tabs, '[]');
    expect(saveStorageItem).toHaveBeenCalledWith(keys.activeTabId, '');
    expect(saveStorageItem).toHaveBeenCalledWith(keys.untitledCounter, '8');
  });
});
