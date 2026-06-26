import type { DocumentTab } from '../types/workspace';
import {
  createWorkspaceSaveScheduler,
  type WorkspaceSaveScheduler
} from '../workspace/saveScheduler';
import type { WorkspaceStorage } from '../workspace/persistence';

type TimerHandle = ReturnType<typeof setTimeout>;

export type WorkspacePersistenceRuntimeOptions = {
  captureActiveTabState(): void;
  clearTimer?: typeof clearTimeout;
  cloudStorage: {
    enabled: boolean;
    saveTimer: TimerHandle | null;
  };
  consoleRef?: Pick<Console, 'warn'>;
  documentRef?: Document;
  flushCloudWorkspaceSave(): void | Promise<void>;
  getTabs(): DocumentTab[];
  setTimer?: typeof setTimeout;
  syncWorkspaceState(): void;
  windowRef?: Window;
  workspaceStorage: WorkspaceStorage;
};

export type WorkspacePersistenceRuntime = {
  detachLifecycleFlush(): void;
  loadActiveTabId(): string | null;
  loadTabsFromStorage(): DocumentTab[];
  loadUntitledCounter(): number;
  saveActiveTabId(id: string | null): void;
  saveTabsToStorage(tabs: DocumentTab[]): void;
  saveUntitledCounter(counter: number): void;
  workspaceSaveScheduler: WorkspaceSaveScheduler;
};

export function createWorkspacePersistenceRuntime(
  options: WorkspacePersistenceRuntimeOptions
): WorkspacePersistenceRuntime {
  const clearTimer = options.clearTimer ?? clearTimeout;
  const workspaceSaveScheduler = createWorkspaceSaveScheduler({
    delayMs: 500,
    getTabs: options.getTabs,
    saveTabs: (tabs) => options.workspaceStorage.saveTabs(tabs),
    syncWorkspace: options.syncWorkspaceState,
    isCloudEnabled: () => options.cloudStorage.enabled,
    clearCloudSaveTimer: () => {
      if (options.cloudStorage.saveTimer) {
        clearTimer(options.cloudStorage.saveTimer);
      }
    },
    flushCloudWorkspaceSave: options.flushCloudWorkspaceSave,
    setTimer: options.setTimer,
    clearTimer,
    consoleRef: options.consoleRef
  });

  const detachLifecycleFlush = workspaceSaveScheduler.installLifecycleFlush({
    windowRef: options.windowRef ?? window,
    documentRef: options.documentRef ?? document,
    captureActiveTabState: options.captureActiveTabState
  });

  function saveAndSync(callback: () => void): void {
    callback();
    options.syncWorkspaceState();
  }

  return {
    detachLifecycleFlush,
    loadActiveTabId() {
      return options.workspaceStorage.loadActiveTabId();
    },
    loadTabsFromStorage() {
      return options.workspaceStorage.loadTabs();
    },
    loadUntitledCounter() {
      return options.workspaceStorage.loadUntitledCounter();
    },
    saveActiveTabId(id) {
      saveAndSync(() => options.workspaceStorage.saveActiveTabId(id));
    },
    saveTabsToStorage(tabs) {
      workspaceSaveScheduler.scheduleTabsSave(tabs);
    },
    saveUntitledCounter(counter) {
      saveAndSync(() => options.workspaceStorage.saveUntitledCounter(counter));
    },
    workspaceSaveScheduler
  };
}
