import type { DocumentTab } from '../types/workspace';

export interface WorkspaceStorageKeys {
  tabs: string;
  activeTabId: string;
  untitledCounter: string;
}

export interface WorkspaceStorageOptions {
  keys: WorkspaceStorageKeys;
  readStorageItem(key: string): string | null;
  saveStorageItem(key: string, value: string): void;
}

export interface WorkspaceStorage {
  loadTabs(): DocumentTab[];
  saveTabs(tabs: DocumentTab[]): void;
  loadActiveTabId(): string | null;
  saveActiveTabId(tabId: string | null): void;
  loadUntitledCounter(): number;
  saveUntitledCounter(counter: number): void;
}

export function parsePersistedTabs(value: string | null): DocumentTab[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as DocumentTab[] : [];
  } catch (_) {
    return [];
  }
}

export function parsePersistedCounter(value: string | null): number {
  const parsed = parseInt(value || '0', 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createWorkspaceStorage(options: WorkspaceStorageOptions): WorkspaceStorage {
  return {
    loadTabs() {
      return parsePersistedTabs(options.readStorageItem(options.keys.tabs));
    },
    saveTabs(tabs) {
      options.saveStorageItem(options.keys.tabs, JSON.stringify(tabs || []));
    },
    loadActiveTabId() {
      return options.readStorageItem(options.keys.activeTabId);
    },
    saveActiveTabId(tabId) {
      options.saveStorageItem(options.keys.activeTabId, tabId || '');
    },
    loadUntitledCounter() {
      return parsePersistedCounter(options.readStorageItem(options.keys.untitledCounter));
    },
    saveUntitledCounter(counter) {
      options.saveStorageItem(options.keys.untitledCounter, String(counter));
    }
  };
}
