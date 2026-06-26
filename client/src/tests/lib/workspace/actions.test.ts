import { describe, expect, it } from 'vitest';
import {
  appendTabToList,
  canOpenAnotherTab,
  closeTabInList,
  createDocumentTab,
  createNextUntitledTitle,
  createUntitledTitle,
  duplicateDocumentTab,
  duplicateTabInList,
  ensureWorkspaceTabs,
  findTabById,
  getActiveTab,
  MAX_DOCUMENT_TABS,
  normalizeWorkspacePayload,
  renameTabInList,
  reorderTabs,
  reorderTabsInList,
  resetWorkspaceTabs,
  updateTabInList
} from '../../../lib/workspace/actions';

describe('workspace actions', () => {
  it('creates deterministic document tabs when clocks/randomness are injected', () => {
    const tab = createDocumentTab({
      content: '# Hello',
      title: 'Readme',
      viewMode: 'preview',
      now: () => 123,
      random: () => 0.5
    });

    expect(tab).toEqual({
      id: 'tab_123_i00000',
      title: 'Readme',
      content: '# Hello',
      scrollPos: 0,
      viewMode: 'preview',
      createdAt: 123
    });
  });

  it('normalizes workspace payloads without changing the persisted shape', () => {
    const normalized = normalizeWorkspacePayload({
      activeTabId: 'missing',
      untitledCounter: 2.7,
      globalState: { theme: 'dark' },
      findReplaceDocked: true,
      tabs: [
        {
          id: 'tab_1',
          title: '',
          content: '# One',
          scrollPos: 8.8,
          viewMode: 'bad-mode' as never,
          createdAt: 456
        }
      ]
    });

    expect(normalized.activeTabId).toBe('tab_1');
    expect(normalized.untitledCounter).toBe(2);
    expect(normalized.findReplaceDocked).toBe(true);
    expect(normalized.tabs[0]).toMatchObject({
      id: 'tab_1',
      title: 'Untitled',
      content: '# One',
      scrollPos: 8,
      viewMode: 'split',
      createdAt: 456
    });
  });

  it('captures tab helpers used by the Svelte rebuild', () => {
    const tab = createDocumentTab({ title: 'Note', content: 'Body', now: () => 10, random: () => 0.25 });
    const duplicate = duplicateDocumentTab(tab, () => 11, () => 0.75);

    expect(createUntitledTitle(3)).toBe('Untitled 3');
    expect(canOpenAnotherTab(new Array(MAX_DOCUMENT_TABS).fill(tab))).toBe(false);
    expect(getActiveTab({ tabs: [tab], activeTabId: tab.id, untitledCounter: 0, globalState: {}, findReplaceDocked: false })).toBe(tab);
    expect(findTabById([tab], tab.id)).toBe(tab);
    expect(findTabById([tab], 'missing')).toBeNull();
    expect(findTabById([tab], null)).toBeNull();
    expect(duplicate.title).toBe('Note (copy)');
    expect(duplicate.content).toBe('Body');
  });

  it('advances untitled counters and returns the matching generated title', () => {
    expect(createNextUntitledTitle(0)).toEqual({ untitledCounter: 1, title: 'Untitled 1' });
    expect(createNextUntitledTitle(3)).toEqual({ untitledCounter: 4, title: 'Untitled 4' });
    expect(createNextUntitledTitle(3.8)).toEqual({ untitledCounter: 4, title: 'Untitled 4' });
    expect(createNextUntitledTitle(-2)).toEqual({ untitledCounter: 1, title: 'Untitled 1' });
    expect(createNextUntitledTitle(Number.NaN)).toEqual({ untitledCounter: 1, title: 'Untitled 1' });
  });

  it('renames and reorders tabs without mutating the source list', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });
    const source = [first, second];

    const renamed = renameTabInList(source, second.id, '  Renamed  ');
    const reordered = reorderTabs(renamed, second.id, first.id);

    expect(source[1].title).toBe('Second');
    expect(renamed[1].title).toBe('Renamed');
    expect(reordered.map((tab) => tab.id)).toEqual([second.id, first.id]);
  });

  it('reports whether a tab reorder changed the tab order', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });

    const changed = reorderTabsInList([first, second], second.id, first.id);
    const sameTab = reorderTabsInList([first, second], first.id, first.id);
    const missingTarget = reorderTabsInList([first, second], first.id, 'missing');

    expect(changed.reordered).toBe(true);
    expect(changed.tabs.map((tab) => tab.id)).toEqual([second.id, first.id]);
    expect(sameTab.reordered).toBe(false);
    expect(sameTab.tabs.map((tab) => tab.id)).toEqual([first.id, second.id]);
    expect(missingTarget.reordered).toBe(false);
    expect(missingTarget.tabs.map((tab) => tab.id)).toEqual([first.id, second.id]);
  });

  it('appends new tabs without mutating the source list', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });
    const source = [first];

    const appended = appendTabToList(source, second);

    expect(source).toEqual([first]);
    expect(appended).toEqual([first, second]);
    expect(appended).not.toBe(source);
    expect(appended[0]).toBe(first);
    expect(appended[1]).toBe(second);
  });

  it('updates one tab snapshot immutably while preserving stable identity fields', () => {
    const first = createDocumentTab({ title: 'First', content: 'One', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', content: 'Two', now: () => 2, random: () => 0.2 });

    const source = [first, second];
    const updated = updateTabInList(source, second.id, {
      title: 'Renamed',
      content: 'Updated',
      scrollPos: 32,
      viewMode: 'preview'
    });

    expect(first.content).toBe('One');
    expect(second.title).toBe('Second');
    expect(updated[0]).toBe(first);
    expect(updated[1]).toEqual({
      ...second,
      title: 'Renamed',
      content: 'Updated',
      scrollPos: 32,
      viewMode: 'preview'
    });
    expect(updateTabInList(source, 'missing', { title: 'Nope' })).toBe(source);
  });

  it('duplicates tabs next to the source tab', () => {
    const first = createDocumentTab({ title: 'First', content: 'One', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', content: 'Two', now: () => 2, random: () => 0.2 });
    const result = duplicateTabInList([first, second], first.id, () => 3, () => 0.3);

    expect(result.duplicate?.title).toBe('First (copy)');
    expect(result.duplicate?.content).toBe('One');
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'First (copy)', 'Second']);
  });

  it('closes tabs and picks the same fallback active tab as the tab UI', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });
    const third = createDocumentTab({ title: 'Third', now: () => 3, random: () => 0.3 });
    const result = closeTabInList([first, second, third], second.id, second.id, () => (
      createDocumentTab({ title: 'Fallback', now: () => 4, random: () => 0.4 })
    ));

    expect(result.closedActiveTab).toBe(true);
    expect(result.activeTabId).toBe(first.id);
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'Third']);

    const last = closeTabInList([first], first.id, first.id, () => (
      createDocumentTab({ title: 'Fallback', now: () => 5, random: () => 0.5 })
    ));

    expect(last.createdFallback?.title).toBe('Fallback');
    expect(last.activeTabId).toBe(last.createdFallback?.id);
    expect(last.tabs).toHaveLength(1);
  });

  it('resets and initializes workspace tabs with a single active fallback', () => {
    const reset = resetWorkspaceTabs('# Welcome', 'Welcome to Markdown', () => 10, () => 0.1);
    const initialized = ensureWorkspaceTabs([], null, '# Welcome', 'Welcome to Markdown', () => 11, () => 0.2);
    const preserved = ensureWorkspaceTabs(reset.tabs, 'missing', '# ignored', 'Ignored');

    expect(reset.untitledCounter).toBe(0);
    expect(reset.tabs).toEqual([reset.activeTab]);
    expect(reset.activeTab.content).toBe('# Welcome');
    expect(initialized.createdFallback).toBe(true);
    expect(initialized.activeTab.content).toBe('# Welcome');
    expect(preserved.createdFallback).toBe(false);
    expect(preserved.activeTabId).toBe(reset.activeTabId);
  });
});
