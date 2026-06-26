import { closeOpenTabMenu } from '../state/tabMenu.svelte';
import { createExportFilename } from '../export/exportFilename';
import {
  ensureWorkspaceTabs,
  findTabById,
  reorderTabsInList
} from '../workspace/actions';
import {
  captureActiveTabSnapshot,
  prepareCloseWorkspaceTab,
  prepareDuplicateWorkspaceTab,
  prepareNewWorkspaceTab,
  prepareRenameWorkspaceTab,
  prepareResetWorkspaceSession,
  prepareTabSwitch
} from '../workspace/session';
import {
  openRenameTabModal,
  openResetTabsModal
} from '../tabs/tabModals';
import type { DocumentTab, ViewMode } from '../types/workspace';

export interface WorkspaceTabsEditor {
  focus(): void;
  scrollTop: number;
  value: string;
}

export interface WorkspaceTabsState {
  getActiveTabId(): string | null;
  getTabs(): DocumentTab[];
  getUntitledCounter(): number;
  setActiveTabId(activeTabId: string | null): void;
  setTabs(tabs: DocumentTab[]): void;
  setUntitledCounter(counter: number): void;
}

export interface WorkspaceTabsPersistence {
  loadActiveTabId(): string | null;
  loadTabsFromStorage(): DocumentTab[];
  loadUntitledCounter(): number;
  saveActiveTabId(activeTabId: string | null): void;
  saveTabsToStorage(tabs: DocumentTab[]): void;
  saveUntitledCounter(counter: number): void;
}

export interface WorkspaceTabsHistory {
  deleteTabHistory(tabId: string): void;
  initTabHistory(tabId: string | null, content: string): void;
  resetTypingHistoryState(): void;
  updateUndoRedoButtons(): void;
}

export interface CreateWorkspaceTabsRuntimeOptions {
  alertRef?: (message: string) => void;
  closeAppModal(modal: HTMLElement): void;
  documentRef?: Document;
  editor: WorkspaceTabsEditor;
  editorPaneContainer: HTMLElement | null;
  getCurrentViewMode(): ViewMode;
  history: WorkspaceTabsHistory;
  openAppModal(
    modal: HTMLElement,
    options?: {
      focusTarget?: HTMLElement | null;
      onClose?: () => void;
    }
  ): void;
  persistence: WorkspaceTabsPersistence;
  renderMarkdown(): void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  resetCurrentViewMode(): void;
  sampleMarkdown: string;
  setViewMode(mode: ViewMode): void;
  state: WorkspaceTabsState;
  syncWorkspaceState(): void;
}

export interface WorkspaceTabsRuntime {
  captureActiveTabState(): void;
  closeTab(tabId: string): void;
  closeTabMenus(): void;
  deleteTab(tabId: string): void;
  duplicateTab(tabId: string): void;
  getActiveEditorSnapshot(): {
    content: string;
    scrollPos: number;
    viewMode: ViewMode;
  };
  getActivePreviewDocumentId(): string;
  getExportFilename(extension: string, fallback: string): string;
  initTabs(): void;
  newTab(content?: string, title?: string | null): void;
  renameTab(tabId: string): void;
  renderTabBar(tabs: DocumentTab[], activeTabId: string | null): void;
  reorderTabs(draggedTabId: string, targetTabId: string): void;
  resetAllTabs(): void;
  saveCurrentTabState(): void;
  switchTab(tabId: string): void;
}

const MAX_TABS_MESSAGE = 'Maximum of 20 tabs reached. Please close an existing tab to open a new one.';
const DEFAULT_DOCUMENT_TITLE = 'Welcome to Markdown';

export function createWorkspaceTabsRuntime(options: CreateWorkspaceTabsRuntimeOptions): WorkspaceTabsRuntime {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const alertRef = options.alertRef ?? alert;

  function getActiveEditorSnapshot() {
    return {
      content: options.editor.value,
      scrollPos: options.editor.scrollTop,
      viewMode: options.getCurrentViewMode() || 'split'
    };
  }

  function closeTabMenus(): void {
    closeOpenTabMenu();
  }

  function renderTabBar(): void {
    closeTabMenus();
    options.syncWorkspaceState();
  }

  function captureActiveTabState(): void {
    const tabs = options.state.getTabs();
    const activeTabId = options.state.getActiveTabId();
    options.state.setTabs(captureActiveTabSnapshot(tabs, activeTabId, getActiveEditorSnapshot()));
  }

  function saveCurrentTabState(): void {
    captureActiveTabState();
    options.persistence.saveTabsToStorage(options.state.getTabs());
  }

  function restoreViewMode(mode: ViewMode | null | undefined): void {
    options.resetCurrentViewMode();
    options.setViewMode(mode || 'split');
  }

  function scrollEditorTo(position: number | null | undefined): void {
    requestFrame(() => {
      options.editor.scrollTop = position || 0;
    });
  }

  function switchTab(tabId: string): void {
    const switchResult = prepareTabSwitch(
      options.state.getTabs(),
      options.state.getActiveTabId(),
      tabId,
      getActiveEditorSnapshot()
    );
    if (!switchResult.switched) return;

    options.state.setTabs(switchResult.tabs);
    options.persistence.saveTabsToStorage(switchResult.tabs);
    options.history.resetTypingHistoryState();
    options.state.setActiveTabId(switchResult.activeTabId);
    options.persistence.saveActiveTabId(switchResult.activeTabId);
    const tab = switchResult.activeTab;
    if (!tab) return;

    options.editor.value = tab.content;
    options.history.initTabHistory(switchResult.activeTabId, tab.content);
    options.history.updateUndoRedoButtons();
    restoreViewMode(tab.viewMode);
    options.renderMarkdown();
    scrollEditorTo(tab.scrollPos);
    renderTabBar();
  }

  function newTab(content?: string, title?: string | null): void {
    const prepared = prepareNewWorkspaceTab(options.state.getTabs(), options.state.getUntitledCounter(), {
      content,
      title
    });
    if (prepared.limitReached) {
      alertRef(MAX_TABS_MESSAGE);
    }
    if (prepared.generatedTitle) {
      options.state.setUntitledCounter(prepared.untitledCounter);
      options.persistence.saveUntitledCounter(prepared.untitledCounter);
    }
    options.state.setTabs(prepared.tabs);
    switchTab(prepared.tab.id);
    options.editor.focus();
  }

  function closeTab(tabId: string): void {
    const result = prepareCloseWorkspaceTab(
      options.state.getTabs(),
      options.state.getActiveTabId(),
      tabId,
      options.state.getUntitledCounter()
    );
    if (!result.closedTab) return;
    if (result.fallbackGenerated) {
      options.state.setUntitledCounter(result.untitledCounter);
      options.persistence.saveUntitledCounter(result.untitledCounter);
    }
    options.history.deleteTabHistory(tabId);
    options.state.setTabs(result.tabs);
    if (result.closedActiveTab || options.state.getActiveTabId() !== result.activeTabId) {
      const newActiveTab = result.activeTab;
      options.state.setActiveTabId(result.activeTabId);
      options.persistence.saveActiveTabId(result.activeTabId);
      if (newActiveTab) {
        options.editor.value = newActiveTab.content;
        restoreViewMode(newActiveTab.viewMode);
        options.renderMarkdown();
        scrollEditorTo(newActiveTab.scrollPos);
      }
    }
    options.persistence.saveTabsToStorage(options.state.getTabs());
    renderTabBar();
  }

  function renameTab(tabId: string): void {
    const tab = findTabById(options.state.getTabs(), tabId);
    if (!tab) return;
    openRenameTabModal({
      closeModal: options.closeAppModal,
      documentRef,
      onRename(title) {
        const renameResult = prepareRenameWorkspaceTab(options.state.getTabs(), tabId, title);
        if (renameResult.renamed) {
          options.state.setTabs(renameResult.tabs);
          options.persistence.saveTabsToStorage(renameResult.tabs);
          renderTabBar();
        }
      },
      openModal: options.openAppModal,
      title: tab.title
    });
  }

  function duplicateTab(tabId: string): void {
    const result = prepareDuplicateWorkspaceTab(options.state.getTabs(), options.state.getActiveTabId(), tabId, {
      currentSnapshot: getActiveEditorSnapshot()
    });
    if (!result.sourceTab) return;
    if (result.limitReached) {
      alertRef(MAX_TABS_MESSAGE);
      return;
    }
    if (!result.duplicate) return;
    options.state.setTabs(result.tabs);
    if (result.shouldSwitchToDuplicate) {
      switchTab(result.duplicate.id);
    } else {
      options.persistence.saveTabsToStorage(options.state.getTabs());
      renderTabBar();
    }
  }

  function resetAllTabs(): void {
    openResetTabsModal({
      closeModal: options.closeAppModal,
      documentRef,
      onReset() {
        const reset = prepareResetWorkspaceSession(options.sampleMarkdown, DEFAULT_DOCUMENT_TITLE);
        options.state.setTabs(reset.tabs);
        options.state.setUntitledCounter(reset.untitledCounter);
        options.state.setActiveTabId(reset.activeTabId);
        options.persistence.saveUntitledCounter(reset.untitledCounter);
        options.persistence.saveActiveTabId(reset.activeTabId);
        options.persistence.saveTabsToStorage(reset.tabs);
        options.editor.value = reset.activeTab.content;
        restoreViewMode(reset.activeTab.viewMode);
        options.renderMarkdown();
        renderTabBar();
      },
      openModal: options.openAppModal
    });
  }

  function initTabs(): void {
    options.state.setUntitledCounter(options.persistence.loadUntitledCounter());
    options.state.setTabs(options.persistence.loadTabsFromStorage());
    options.state.setActiveTabId(options.persistence.loadActiveTabId());
    const initialized = ensureWorkspaceTabs(
      options.state.getTabs(),
      options.state.getActiveTabId(),
      options.sampleMarkdown,
      DEFAULT_DOCUMENT_TITLE
    );
    options.state.setTabs(initialized.tabs);
    const initializedActiveTabId = initialized.activeTabId;
    if (initialized.createdFallback) {
      options.state.setActiveTabId(initializedActiveTabId);
      options.persistence.saveTabsToStorage(options.state.getTabs());
      options.persistence.saveActiveTabId(options.state.getActiveTabId());
    } else if (options.state.getActiveTabId() !== initializedActiveTabId) {
      options.state.setActiveTabId(initializedActiveTabId);
      options.persistence.saveActiveTabId(options.state.getActiveTabId());
    }

    const activeTab = initialized.activeTab;
    options.editor.value = activeTab.content;
    options.history.initTabHistory(options.state.getActiveTabId(), activeTab.content);
    options.history.updateUndoRedoButtons();
    restoreViewMode(activeTab.viewMode);
    options.renderMarkdown();
    options.editorPaneContainer?.classList.remove('is-loading');
    scrollEditorTo(activeTab.scrollPos);
    renderTabBar();
  }

  function reorderTabs(draggedTabId: string, targetTabId: string): void {
    const result = reorderTabsInList(options.state.getTabs(), draggedTabId, targetTabId);
    if (!result.reordered) return;
    options.state.setTabs(result.tabs);
    options.persistence.saveTabsToStorage(result.tabs);
    renderTabBar();
  }

  function getExportFilename(extension: string, fallback: string): string {
    const activeTab = findTabById(options.state.getTabs(), options.state.getActiveTabId());
    return createExportFilename({
      extension,
      fallback,
      title: activeTab ? activeTab.title : ''
    });
  }

  function getActivePreviewDocumentId(): string {
    return options.state.getActiveTabId() || '__single-document__';
  }

  return {
    captureActiveTabState,
    closeTab,
    closeTabMenus,
    deleteTab: closeTab,
    duplicateTab,
    getActiveEditorSnapshot,
    getActivePreviewDocumentId,
    getExportFilename,
    initTabs,
    newTab,
    renameTab,
    renderTabBar,
    reorderTabs,
    resetAllTabs,
    saveCurrentTabState,
    switchTab
  };
}
