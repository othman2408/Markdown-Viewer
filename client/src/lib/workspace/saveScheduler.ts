import type { DocumentTab } from '../types/workspace';

type TimerHandle = ReturnType<typeof setTimeout>;

interface WorkspaceSaveSchedulerOptions {
  delayMs?: number;
  getTabs(): DocumentTab[];
  saveTabs(tabs: DocumentTab[]): void;
  syncWorkspace(): void;
  isCloudEnabled(): boolean;
  clearCloudSaveTimer(): void;
  flushCloudWorkspaceSave(): void | Promise<void>;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  consoleRef?: Pick<Console, 'warn'>;
}

interface LifecycleTarget {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface VisibilityDocumentTarget extends LifecycleTarget {
  visibilityState: DocumentVisibilityState;
}

interface InstallLifecycleFlushOptions {
  windowRef: LifecycleTarget;
  documentRef: VisibilityDocumentTarget;
  captureActiveTabState(): void;
}

export interface WorkspaceSaveScheduler {
  clearPendingSave(): void;
  flushTabs(tabs?: DocumentTab[]): void;
  installLifecycleFlush(options: InstallLifecycleFlushOptions): () => void;
  scheduleCurrentTabSave(saveCurrentTabState: () => void): void;
  scheduleTabsSave(tabs?: DocumentTab[]): void;
}

export function createWorkspaceSaveScheduler(options: WorkspaceSaveSchedulerOptions): WorkspaceSaveScheduler {
  const delayMs = options.delayMs ?? 500;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const consoleRef = options.consoleRef ?? console;
  let saveTimer: TimerHandle | null = null;

  function clearPendingSave(): void {
    if (saveTimer) {
      clearTimer(saveTimer);
      saveTimer = null;
    }
  }

  function flushTabs(tabs?: DocumentTab[]): void {
    clearPendingSave();

    try {
      options.saveTabs(tabs || options.getTabs());
      options.syncWorkspace();

      if (options.isCloudEnabled()) {
        options.clearCloudSaveTimer();
        void options.flushCloudWorkspaceSave();
      }
    } catch (error) {
      consoleRef.warn('Failed to save workspace tabs:', error);
    }
  }

  function scheduleTabsSave(tabs?: DocumentTab[]): void {
    clearPendingSave();
    saveTimer = setTimer(() => {
      flushTabs(tabs);
    }, delayMs);
    options.syncWorkspace();
  }

  function scheduleCurrentTabSave(saveCurrentTabState: () => void): void {
    clearPendingSave();
    saveTimer = setTimer(saveCurrentTabState, delayMs);
  }

  function installLifecycleFlush(lifecycleOptions: InstallLifecycleFlushOptions): () => void {
    function flushCurrentTabs(): void {
      lifecycleOptions.captureActiveTabState();
      flushTabs();
    }

    function handleVisibilityChange(): void {
      if (lifecycleOptions.documentRef.visibilityState === 'hidden') {
        flushCurrentTabs();
      }
    }

    lifecycleOptions.windowRef.addEventListener('beforeunload', flushCurrentTabs);
    lifecycleOptions.documentRef.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      lifecycleOptions.windowRef.removeEventListener('beforeunload', flushCurrentTabs);
      lifecycleOptions.documentRef.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  return {
    clearPendingSave,
    flushTabs,
    installLifecycleFlush,
    scheduleCurrentTabSave,
    scheduleTabsSave
  };
}
