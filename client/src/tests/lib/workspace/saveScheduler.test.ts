import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentTab } from '../../../lib/workspace/actions';
import { createWorkspaceSaveScheduler } from '../../../lib/workspace/saveScheduler';
import type { DocumentTab } from '../../../lib/types/workspace';

class FakeLifecycleTarget {
  listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) || []) {
      listener();
    }
  }
}

function createHarness({ cloudEnabled = false, saveThrows = false } = {}) {
  const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
  const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });
  const currentTabs = [first];
  const savedTabs: DocumentTab[][] = [];
  const saveTabs = vi.fn((tabs: DocumentTab[]) => {
    if (saveThrows) throw new Error('storage failed');
    savedTabs.push(tabs);
  });
  const syncWorkspace = vi.fn();
  const clearCloudSaveTimer = vi.fn();
  const flushCloudWorkspaceSave = vi.fn();
  const warn = vi.fn();
  const scheduler = createWorkspaceSaveScheduler({
    delayMs: 500,
    getTabs: () => currentTabs,
    saveTabs,
    syncWorkspace,
    isCloudEnabled: () => cloudEnabled,
    clearCloudSaveTimer,
    flushCloudWorkspaceSave,
    consoleRef: { warn }
  });

  return {
    clearCloudSaveTimer,
    currentTabs,
    first,
    flushCloudWorkspaceSave,
    saveTabs,
    savedTabs,
    scheduler,
    second,
    syncWorkspace,
    warn
  };
}

describe('workspace save scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces tab persistence while syncing Svelte workspace state immediately', () => {
    const { first, saveTabs, savedTabs, scheduler, second, syncWorkspace } = createHarness();

    scheduler.scheduleTabsSave([first]);
    scheduler.scheduleTabsSave([second]);

    expect(syncWorkspace).toHaveBeenCalledTimes(2);
    expect(saveTabs).not.toHaveBeenCalled();

    vi.advanceTimersByTime(499);
    expect(saveTabs).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(savedTabs).toEqual([[second]]);
    expect(syncWorkspace).toHaveBeenCalledTimes(3);
  });

  it('preserves the existing two-step typing save timing', () => {
    const { saveTabs, savedTabs, scheduler, second, syncWorkspace } = createHarness();

    scheduler.scheduleCurrentTabSave(() => {
      scheduler.scheduleTabsSave([second]);
    });

    vi.advanceTimersByTime(500);
    expect(saveTabs).not.toHaveBeenCalled();
    expect(syncWorkspace).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(500);
    expect(savedTabs).toEqual([[second]]);
    expect(syncWorkspace).toHaveBeenCalledTimes(2);
  });

  it('flushes immediately, clears pending saves, and forwards cloud flushes when enabled', () => {
    const {
      clearCloudSaveTimer,
      first,
      flushCloudWorkspaceSave,
      saveTabs,
      savedTabs,
      scheduler,
      syncWorkspace
    } = createHarness({ cloudEnabled: true });

    scheduler.scheduleTabsSave([first]);
    scheduler.flushTabs([first]);
    vi.advanceTimersByTime(500);

    expect(saveTabs).toHaveBeenCalledTimes(1);
    expect(savedTabs).toEqual([[first]]);
    expect(syncWorkspace).toHaveBeenCalledTimes(2);
    expect(clearCloudSaveTimer).toHaveBeenCalledTimes(1);
    expect(flushCloudWorkspaceSave).toHaveBeenCalledTimes(1);
  });

  it('installs beforeunload and hidden visibility flush handlers', () => {
    const { first, saveTabs, savedTabs, scheduler } = createHarness();
    const windowRef = new FakeLifecycleTarget();
    const documentRef = Object.assign(new FakeLifecycleTarget(), {
      visibilityState: 'visible' as DocumentVisibilityState
    });
    const captureActiveTabState = vi.fn();
    const cleanup = scheduler.installLifecycleFlush({ windowRef, documentRef, captureActiveTabState });

    windowRef.emit('beforeunload');
    documentRef.visibilityState = 'hidden';
    documentRef.emit('visibilitychange');
    cleanup();
    windowRef.emit('beforeunload');

    expect(captureActiveTabState).toHaveBeenCalledTimes(2);
    expect(saveTabs).toHaveBeenCalledTimes(2);
    expect(savedTabs).toEqual([[first], [first]]);
  });

  it('warns and keeps the app running when storage save fails', () => {
    const { scheduler, warn } = createHarness({ saveThrows: true });

    scheduler.flushTabs();

    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0][0])).toContain('Failed to save workspace tabs');
  });
});
