import type { DocumentTab, ViewMode } from '../types/workspace';
import {
  appendTabToList,
  closeTabInList,
  createDocumentTab,
  createNextUntitledTitle,
  duplicateTabInList,
  findTabById,
  MAX_DOCUMENT_TABS,
  renameTabInList,
  resetWorkspaceTabs,
  type CloseTabResult,
  type DuplicateTabResult,
  type ResetWorkspaceTabsResult,
  updateTabInList
} from './actions';

export interface ActiveTabSnapshot {
  content: string;
  scrollPos: number;
  viewMode: ViewMode;
}

export interface PrepareTabSwitchResult {
  activeTab: DocumentTab | null;
  activeTabId: string | null;
  switched: boolean;
  tabs: DocumentTab[];
}

interface PrepareNewWorkspaceTabInput {
  content?: string;
  now?: () => number;
  random?: () => number;
  title?: string | null;
  viewMode?: ViewMode;
}

export interface PrepareNewWorkspaceTabResult {
  generatedTitle: boolean;
  limitReached: boolean;
  tab: DocumentTab;
  tabs: DocumentTab[];
  untitledCounter: number;
}

interface RandomizedTabInput {
  now?: () => number;
  random?: () => number;
}

export interface PrepareCloseWorkspaceTabResult extends CloseTabResult {
  fallbackGenerated: boolean;
  untitledCounter: number;
}

interface PrepareDuplicateWorkspaceTabInput extends RandomizedTabInput {
  currentSnapshot?: ActiveTabSnapshot;
}

export interface PrepareDuplicateWorkspaceTabResult extends DuplicateTabResult {
  limitReached: boolean;
  shouldSwitchToDuplicate: boolean;
  sourceTab: DocumentTab | null;
}

export interface PrepareRenameWorkspaceTabResult {
  renamed: boolean;
  sourceTab: DocumentTab | null;
  tabs: DocumentTab[];
  trimmedTitle: string;
}

export function captureActiveTabSnapshot(
  tabs: DocumentTab[],
  activeTabId: string | null,
  snapshot: ActiveTabSnapshot
): DocumentTab[] {
  if (!findTabById(tabs, activeTabId)) return tabs;
  return updateTabInList(tabs, activeTabId, snapshot);
}

export function prepareTabSwitch(
  tabs: DocumentTab[],
  activeTabId: string | null,
  targetTabId: string,
  currentSnapshot?: ActiveTabSnapshot
): PrepareTabSwitchResult {
  if (targetTabId === activeTabId) {
    return {
      activeTab: findTabById(tabs, activeTabId),
      activeTabId,
      switched: false,
      tabs
    };
  }

  const nextTabs = currentSnapshot
    ? captureActiveTabSnapshot(tabs, activeTabId, currentSnapshot)
    : tabs;

  return {
    activeTab: findTabById(nextTabs, targetTabId),
    activeTabId: targetTabId,
    switched: true,
    tabs: nextTabs
  };
}

export function prepareNewWorkspaceTab(
  tabs: DocumentTab[],
  untitledCounter: number,
  input: PrepareNewWorkspaceTabInput = {}
): PrepareNewWorkspaceTabResult {
  const generatedTitle = !input.title;
  const nextUntitled = generatedTitle
    ? createNextUntitledTitle(untitledCounter)
    : { title: input.title || null, untitledCounter };
  const tab = createDocumentTab({
    content: input.content === undefined ? '' : input.content,
    title: nextUntitled.title,
    viewMode: input.viewMode === undefined ? 'split' : input.viewMode,
    now: input.now,
    random: input.random
  });

  return {
    generatedTitle,
    limitReached: tabs.length >= MAX_DOCUMENT_TABS,
    tab,
    tabs: appendTabToList(tabs, tab),
    untitledCounter: nextUntitled.untitledCounter
  };
}

export function prepareCloseWorkspaceTab(
  tabs: DocumentTab[],
  activeTabId: string | null,
  tabId: string,
  untitledCounter: number,
  input: RandomizedTabInput = {}
): PrepareCloseWorkspaceTabResult {
  let nextUntitledCounter = untitledCounter;
  let fallbackGenerated = false;
  const result = closeTabInList(tabs, activeTabId, tabId, () => {
    const nextUntitled = createNextUntitledTitle(nextUntitledCounter);
    nextUntitledCounter = nextUntitled.untitledCounter;
    fallbackGenerated = true;

    return createDocumentTab({
      content: '',
      title: nextUntitled.title,
      viewMode: 'split',
      now: input.now,
      random: input.random
    });
  });

  return {
    ...result,
    fallbackGenerated,
    untitledCounter: nextUntitledCounter
  };
}

export function prepareDuplicateWorkspaceTab(
  tabs: DocumentTab[],
  activeTabId: string | null,
  tabId: string,
  input: PrepareDuplicateWorkspaceTabInput = {}
): PrepareDuplicateWorkspaceTabResult {
  const sourceTab = findTabById(tabs, tabId);
  const shouldSwitchToDuplicate = tabId === activeTabId;

  if (!sourceTab) {
    return {
      duplicate: null,
      limitReached: false,
      shouldSwitchToDuplicate,
      sourceTab: null,
      tabs
    };
  }

  if (tabs.length >= MAX_DOCUMENT_TABS) {
    return {
      duplicate: null,
      limitReached: true,
      shouldSwitchToDuplicate,
      sourceTab,
      tabs
    };
  }

  const nextTabs = input.currentSnapshot
    ? captureActiveTabSnapshot(tabs, activeTabId, input.currentSnapshot)
    : tabs;
  const result = duplicateTabInList(nextTabs, tabId, input.now, input.random);

  return {
    ...result,
    limitReached: false,
    shouldSwitchToDuplicate,
    sourceTab
  };
}

export function prepareRenameWorkspaceTab(
  tabs: DocumentTab[],
  tabId: string,
  title: string
): PrepareRenameWorkspaceTabResult {
  const sourceTab = findTabById(tabs, tabId);
  const trimmedTitle = title.trim();

  if (!sourceTab || !trimmedTitle) {
    return {
      renamed: false,
      sourceTab,
      tabs,
      trimmedTitle
    };
  }

  return {
    renamed: true,
    sourceTab,
    tabs: renameTabInList(tabs, tabId, trimmedTitle),
    trimmedTitle
  };
}

export function prepareResetWorkspaceSession(
  content: string,
  title = 'Welcome to Markdown',
  input: RandomizedTabInput = {}
): ResetWorkspaceTabsResult {
  return resetWorkspaceTabs(content, title, input.now, input.random);
}
