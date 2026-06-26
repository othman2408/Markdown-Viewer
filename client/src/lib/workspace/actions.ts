import type { DocumentTab, ViewMode, WorkspacePayload } from '../types/workspace';

export const MAX_DOCUMENT_TABS = 20;

interface CreateTabInput {
  content?: string;
  title?: string | null;
  viewMode?: ViewMode;
  now?: () => number;
  random?: () => number;
}

function normalizeViewMode(value: unknown): ViewMode {
  return value === 'editor' || value === 'preview' || value === 'split' ? value : 'split';
}

export function createUntitledTitle(counter: number): string {
  return `Untitled ${Math.max(0, Math.floor(counter))}`;
}

export interface NextUntitledTitleResult {
  untitledCounter: number;
  title: string;
}

export function createNextUntitledTitle(counter: number): NextUntitledTitleResult {
  const safeCounter = Number.isFinite(Number(counter))
    ? Math.max(0, Math.floor(Number(counter)))
    : 0;
  const untitledCounter = safeCounter + 1;

  return {
    untitledCounter,
    title: createUntitledTitle(untitledCounter)
  };
}

export function createDocumentTab(input: CreateTabInput = {}): DocumentTab {
  const now = input.now || Date.now;
  const random = input.random || Math.random;
  const createdAt = now();
  const randomPart = random().toString(36).substring(2, 8).padEnd(6, '0').slice(0, 6);

  return {
    id: `tab_${createdAt}_${randomPart}`,
    title: input.title || 'Untitled',
    content: input.content || '',
    scrollPos: 0,
    viewMode: normalizeViewMode(input.viewMode),
    createdAt
  };
}

export function canOpenAnotherTab(tabs: DocumentTab[]): boolean {
  return tabs.length < MAX_DOCUMENT_TABS;
}

export function getActiveTab(payload: WorkspacePayload): DocumentTab | null {
  return payload.tabs.find((tab) => tab.id === payload.activeTabId) || null;
}

export function findTabById(tabs: DocumentTab[], tabId: string | null): DocumentTab | null {
  if (!tabId) return null;
  return tabs.find((tab) => tab.id === tabId) || null;
}

export function normalizeWorkspacePayload(payload: Partial<WorkspacePayload> = {}): WorkspacePayload {
  const tabs = Array.isArray(payload.tabs)
    ? payload.tabs
      .filter((tab): tab is DocumentTab => Boolean(tab && tab.id))
      .map((tab) => ({
        id: String(tab.id),
        title: String(tab.title || 'Untitled'),
        content: String(tab.content || ''),
        scrollPos: Number.isFinite(Number(tab.scrollPos)) ? Math.max(0, Math.floor(Number(tab.scrollPos))) : 0,
        viewMode: normalizeViewMode(tab.viewMode),
        createdAt: Number.isFinite(Number(tab.createdAt)) ? Number(tab.createdAt) : Date.now()
      }))
    : [];
  const activeTabId = tabs.some((tab) => tab.id === payload.activeTabId)
    ? payload.activeTabId || null
    : tabs[0]?.id || null;

  return {
    tabs,
    activeTabId,
    untitledCounter: Number.isFinite(Number(payload.untitledCounter))
      ? Math.max(0, Math.floor(Number(payload.untitledCounter)))
      : 0,
    globalState: payload.globalState && typeof payload.globalState === 'object' ? payload.globalState : {},
    findReplaceDocked: Boolean(payload.findReplaceDocked)
  };
}

export function duplicateDocumentTab(tab: DocumentTab, now: () => number = Date.now, random: () => number = Math.random): DocumentTab {
  return createDocumentTab({
    content: tab.content,
    title: `${tab.title} (copy)`,
    viewMode: tab.viewMode,
    now,
    random
  });
}

function cloneTabs(tabs: DocumentTab[]): DocumentTab[] {
  return normalizeWorkspacePayload({ tabs }).tabs;
}

export function appendTabToList(tabs: DocumentTab[], tab: DocumentTab): DocumentTab[] {
  return [...tabs, tab];
}

export type DocumentTabPatch = Partial<Pick<DocumentTab, 'title' | 'content' | 'scrollPos' | 'viewMode'>>;

export function updateTabInList(tabs: DocumentTab[], tabId: string | null, patch: DocumentTabPatch): DocumentTab[] {
  if (!tabId) return tabs;

  let updated = false;
  const nextTabs = tabs.map((tab) => {
    if (tab.id !== tabId) return tab;
    updated = true;
    return {
      ...tab,
      ...patch,
      id: tab.id,
      createdAt: tab.createdAt
    };
  });

  return updated ? nextTabs : tabs;
}

export function renameTabInList(tabs: DocumentTab[], tabId: string, title: string): DocumentTab[] {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return cloneTabs(tabs);

  return cloneTabs(tabs).map((tab) => (
    tab.id === tabId ? { ...tab, title: trimmedTitle } : tab
  ));
}

export interface DuplicateTabResult {
  tabs: DocumentTab[];
  duplicate: DocumentTab | null;
}

export function duplicateTabInList(
  tabs: DocumentTab[],
  tabId: string,
  now: () => number = Date.now,
  random: () => number = Math.random
): DuplicateTabResult {
  const normalizedTabs = cloneTabs(tabs);
  const index = normalizedTabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) {
    return { tabs: normalizedTabs, duplicate: null };
  }

  const duplicate = duplicateDocumentTab(normalizedTabs[index], now, random);
  return {
    tabs: [
      ...normalizedTabs.slice(0, index + 1),
      duplicate,
      ...normalizedTabs.slice(index + 1)
    ],
    duplicate
  };
}

export interface CloseTabResult {
  tabs: DocumentTab[];
  activeTabId: string | null;
  activeTab: DocumentTab | null;
  closedTab: DocumentTab | null;
  createdFallback: DocumentTab | null;
  closedActiveTab: boolean;
}

export function closeTabInList(
  tabs: DocumentTab[],
  activeTabId: string | null,
  tabId: string,
  createFallback: () => DocumentTab
): CloseTabResult {
  const normalizedTabs = cloneTabs(tabs);
  const index = normalizedTabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) {
    const activeTab = normalizedTabs.find((tab) => tab.id === activeTabId) || normalizedTabs[0] || null;
    return {
      tabs: normalizedTabs,
      activeTabId: activeTab?.id || null,
      activeTab,
      closedTab: null,
      createdFallback: null,
      closedActiveTab: false
    };
  }

  const closedTab = normalizedTabs[index];
  const remainingTabs = [
    ...normalizedTabs.slice(0, index),
    ...normalizedTabs.slice(index + 1)
  ];
  const closedActiveTab = closedTab.id === activeTabId;

  if (remainingTabs.length === 0) {
    const fallback = createFallback();
    return {
      tabs: [fallback],
      activeTabId: fallback.id,
      activeTab: fallback,
      closedTab,
      createdFallback: fallback,
      closedActiveTab
    };
  }

  const nextActiveTab = closedActiveTab
    ? remainingTabs[Math.max(0, index - 1)]
    : remainingTabs.find((tab) => tab.id === activeTabId) || remainingTabs[0];

  return {
    tabs: remainingTabs,
    activeTabId: nextActiveTab.id,
    activeTab: nextActiveTab,
    closedTab,
    createdFallback: null,
    closedActiveTab
  };
}

export function reorderTabs(tabs: DocumentTab[], draggedTabId: string, targetTabId: string): DocumentTab[] {
  const normalizedTabs = cloneTabs(tabs);
  if (!draggedTabId || !targetTabId || draggedTabId === targetTabId) return normalizedTabs;

  const fromIndex = normalizedTabs.findIndex((tab) => tab.id === draggedTabId);
  const toIndex = normalizedTabs.findIndex((tab) => tab.id === targetTabId);
  if (fromIndex === -1 || toIndex === -1) return normalizedTabs;

  const reorderedTabs = [...normalizedTabs];
  const [movedTab] = reorderedTabs.splice(fromIndex, 1);
  reorderedTabs.splice(toIndex, 0, movedTab);
  return reorderedTabs;
}

export interface ReorderTabsResult {
  tabs: DocumentTab[];
  reordered: boolean;
}

function hasSameTabOrder(leftTabs: DocumentTab[], rightTabs: DocumentTab[]): boolean {
  if (leftTabs.length !== rightTabs.length) return false;
  return leftTabs.every((tab, index) => tab.id === rightTabs[index]?.id);
}

export function reorderTabsInList(tabs: DocumentTab[], draggedTabId: string, targetTabId: string): ReorderTabsResult {
  const reorderedTabs = reorderTabs(tabs, draggedTabId, targetTabId);

  return {
    tabs: reorderedTabs,
    reordered: !hasSameTabOrder(tabs, reorderedTabs)
  };
}

export interface ResetWorkspaceTabsResult {
  tabs: DocumentTab[];
  activeTabId: string;
  untitledCounter: number;
  activeTab: DocumentTab;
}

export function resetWorkspaceTabs(
  content: string,
  title = 'Welcome to Markdown',
  now: () => number = Date.now,
  random: () => number = Math.random
): ResetWorkspaceTabsResult {
  const activeTab = createDocumentTab({
    content,
    title,
    viewMode: 'split',
    now,
    random
  });

  return {
    tabs: [activeTab],
    activeTabId: activeTab.id,
    untitledCounter: 0,
    activeTab
  };
}

export interface EnsureWorkspaceTabsResult {
  tabs: DocumentTab[];
  activeTabId: string;
  activeTab: DocumentTab;
  createdFallback: boolean;
}

export function ensureWorkspaceTabs(
  tabs: DocumentTab[],
  activeTabId: string | null,
  fallbackContent: string,
  fallbackTitle = 'Welcome to Markdown',
  now: () => number = Date.now,
  random: () => number = Math.random
): EnsureWorkspaceTabsResult {
  const normalizedTabs = cloneTabs(tabs);
  if (normalizedTabs.length === 0) {
    const fallback = createDocumentTab({
      content: fallbackContent,
      title: fallbackTitle,
      viewMode: 'split',
      now,
      random
    });
    return {
      tabs: [fallback],
      activeTabId: fallback.id,
      activeTab: fallback,
      createdFallback: true
    };
  }

  const activeTab = normalizedTabs.find((tab) => tab.id === activeTabId) || normalizedTabs[0];
  return {
    tabs: normalizedTabs,
    activeTabId: activeTab.id,
    activeTab,
    createdFallback: false
  };
}
