import type { TabMenuAction } from '../types/workspace';

interface TabChromeBridge {
  createTab?: (closeMobileAfterCreate?: boolean) => void;
  reorderTabs?: (draggedTabId: string, targetTabId: string) => void;
  resetTabs?: (closeMobileAfterReset?: boolean) => void;
  runMenuAction?: (tabId: string, action: TabMenuAction, isMobileMenu?: boolean) => void;
  selectTab?: (tabId: string, closeMobileAfterSelect?: boolean) => void;
}

declare global {
  interface Window {
    markdownViewerTabs?: TabChromeBridge;
  }
}

export function dispatchCreateTab(closeMobileAfterCreate = false): void {
  window.markdownViewerTabs?.createTab?.(closeMobileAfterCreate);
}

export function dispatchTabReorder(draggedTabId: string, targetTabId: string): void {
  window.markdownViewerTabs?.reorderTabs?.(draggedTabId, targetTabId);
}

export function dispatchResetTabs(closeMobileAfterReset = false): void {
  window.markdownViewerTabs?.resetTabs?.(closeMobileAfterReset);
}

export function dispatchTabMenuAction(tabId: string, action: TabMenuAction, isMobileMenu = false): void {
  window.markdownViewerTabs?.runMenuAction?.(tabId, action, isMobileMenu);
}

export function dispatchTabSelect(tabId: string, closeMobileAfterSelect = false): void {
  window.markdownViewerTabs?.selectTab?.(tabId, closeMobileAfterSelect);
}
