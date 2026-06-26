import type { TabMenuAction } from '../types/workspace';

export interface WorkspaceTabCommandHandlers {
  closeMobileMenu(): void;
  closeTabMenus(): void;
  createTab(): void;
  deleteTab(tabId: string): void;
  duplicateTab(tabId: string): void;
  renameTab(tabId: string): void;
  reorderTabs(draggedTabId: string, targetTabId: string): void;
  resetTabs(): void;
  selectTab(tabId: string): void;
}

export interface WorkspaceTabCommandController {
  createTab(closeMobileAfterCreate?: boolean): void;
  reorderTabs(draggedTabId: string, targetTabId: string): void;
  resetTabs(closeMobileAfterReset?: boolean): void;
  runMenuAction(tabId: string, action: TabMenuAction, isMobileMenu?: boolean): void;
  selectTab(tabId: string, closeMobileAfterSelect?: boolean): void;
}

export function createWorkspaceTabCommandController(
  handlers: WorkspaceTabCommandHandlers
): WorkspaceTabCommandController {
  return {
    createTab(closeMobileAfterCreate = false) {
      handlers.createTab();
      if (closeMobileAfterCreate) handlers.closeMobileMenu();
    },

    reorderTabs(draggedTabId, targetTabId) {
      handlers.reorderTabs(draggedTabId, targetTabId);
    },

    resetTabs(closeMobileAfterReset = false) {
      if (closeMobileAfterReset) handlers.closeMobileMenu();
      handlers.resetTabs();
    },

    runMenuAction(tabId, action, isMobileMenu = false) {
      if (!tabId || !action) return;

      handlers.closeTabMenus();

      if (action === 'rename') {
        if (isMobileMenu) handlers.closeMobileMenu();
        handlers.renameTab(tabId);
        return;
      }

      if (action === 'duplicate') {
        handlers.duplicateTab(tabId);
        if (isMobileMenu) handlers.closeMobileMenu();
        return;
      }

      if (action === 'delete') {
        handlers.deleteTab(tabId);
      }
    },

    selectTab(tabId, closeMobileAfterSelect = false) {
      if (!tabId) return;

      handlers.selectTab(tabId);
      if (closeMobileAfterSelect) handlers.closeMobileMenu();
    }
  };
}
