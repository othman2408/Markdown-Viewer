import { describe, expect, it } from 'vitest';
import { createDocumentTab, MAX_DOCUMENT_TABS } from '../../../lib/workspace/actions';
import {
  captureActiveTabSnapshot,
  prepareCloseWorkspaceTab,
  prepareDuplicateWorkspaceTab,
  prepareNewWorkspaceTab,
  prepareRenameWorkspaceTab,
  prepareResetWorkspaceSession,
  prepareTabSwitch
} from '../../../lib/workspace/session';

describe('workspace session helpers', () => {
  it('captures the active editor snapshot without mutating the source tabs', () => {
    const first = createDocumentTab({ title: 'First', content: 'Old', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', content: 'Two', now: () => 2, random: () => 0.2 });
    const source = [first, second];

    const result = captureActiveTabSnapshot(source, first.id, {
      content: 'Updated',
      scrollPos: 42,
      viewMode: 'preview'
    });

    expect(source[0].content).toBe('Old');
    expect(result[0]).toEqual({
      ...first,
      content: 'Updated',
      scrollPos: 42,
      viewMode: 'preview'
    });
    expect(result[1]).toBe(second);
  });

  it('leaves tabs unchanged when there is no active tab to capture', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const source = [first];

    expect(captureActiveTabSnapshot(source, 'missing', {
      content: 'Ignored',
      scrollPos: 1,
      viewMode: 'split'
    })).toBe(source);
    expect(captureActiveTabSnapshot(source, null, {
      content: 'Ignored',
      scrollPos: 1,
      viewMode: 'split'
    })).toBe(source);
  });

  it('prepares tab switches by saving the current tab snapshot first', () => {
    const first = createDocumentTab({ title: 'First', content: 'Old', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', content: 'Two', now: () => 2, random: () => 0.2 });

    const result = prepareTabSwitch([first, second], first.id, second.id, {
      content: 'Captured before switch',
      scrollPos: 12,
      viewMode: 'editor'
    });

    expect(result.switched).toBe(true);
    expect(result.activeTabId).toBe(second.id);
    expect(result.activeTab).toEqual(second);
    expect(result.tabs[0]).toMatchObject({
      content: 'Captured before switch',
      scrollPos: 12,
      viewMode: 'editor'
    });
  });

  it('preserves no-op and missing-target switch behavior from the workspace payload', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });

    const same = prepareTabSwitch([first], first.id, first.id, {
      content: 'Ignored',
      scrollPos: 8,
      viewMode: 'preview'
    });
    const missing = prepareTabSwitch([first], first.id, 'missing', {
      content: 'Captured',
      scrollPos: 9,
      viewMode: 'preview'
    });

    expect(same.switched).toBe(false);
    expect(same.tabs).toEqual([first]);
    expect(missing.switched).toBe(true);
    expect(missing.activeTabId).toBe('missing');
    expect(missing.activeTab).toBeNull();
    expect(missing.tabs[0]).toMatchObject({ content: 'Captured' });
  });

  it('prepares new tabs with generated titles and advanced counters', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const result = prepareNewWorkspaceTab([first], 2, {
      content: '# New',
      now: () => 3,
      random: () => 0.3
    });

    expect(result.generatedTitle).toBe(true);
    expect(result.untitledCounter).toBe(3);
    expect(result.tab.title).toBe('Untitled 3');
    expect(result.tab.content).toBe('# New');
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'Untitled 3']);
  });

  it('keeps explicit titles from advancing the untitled counter', () => {
    const result = prepareNewWorkspaceTab([], 7, {
      title: 'Named',
      content: 'Body',
      viewMode: 'preview',
      now: () => 4,
      random: () => 0.4
    });

    expect(result.generatedTitle).toBe(false);
    expect(result.untitledCounter).toBe(7);
    expect(result.tab).toMatchObject({
      title: 'Named',
      content: 'Body',
      viewMode: 'preview'
    });
  });

  it('reports the max-tab condition while preserving the append behavior', () => {
    const tabs = Array.from({ length: MAX_DOCUMENT_TABS }, (_, index) => (
      createDocumentTab({ title: `Tab ${index}`, now: () => index, random: () => 0.1 })
    ));
    const result = prepareNewWorkspaceTab(tabs, 0, {
      now: () => 99,
      random: () => 0.9
    });

    expect(result.limitReached).toBe(true);
    expect(result.tabs).toHaveLength(MAX_DOCUMENT_TABS + 1);
  });

  it('prepares inactive tab closes without changing the active tab or untitled counter', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });

    const result = prepareCloseWorkspaceTab([first, second], first.id, second.id, 4);

    expect(result.closedTab?.id).toBe(second.id);
    expect(result.closedActiveTab).toBe(false);
    expect(result.activeTabId).toBe(first.id);
    expect(result.fallbackGenerated).toBe(false);
    expect(result.untitledCounter).toBe(4);
    expect(result.tabs.map((tab) => tab.id)).toEqual([first.id]);
  });

  it('prepares active tab closes by selecting the previous tab', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });
    const third = createDocumentTab({ title: 'Third', now: () => 3, random: () => 0.3 });

    const result = prepareCloseWorkspaceTab([first, second, third], second.id, second.id, 0);

    expect(result.closedActiveTab).toBe(true);
    expect(result.activeTabId).toBe(first.id);
    expect(result.activeTab?.title).toBe('First');
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'Third']);
  });

  it('prepares last-tab closes by creating a generated fallback tab', () => {
    const first = createDocumentTab({ title: 'Only', now: () => 1, random: () => 0.1 });

    const result = prepareCloseWorkspaceTab([first], first.id, first.id, 2, {
      now: () => 9,
      random: () => 0.9
    });

    expect(result.closedTab?.id).toBe(first.id);
    expect(result.fallbackGenerated).toBe(true);
    expect(result.untitledCounter).toBe(3);
    expect(result.createdFallback).toMatchObject({
      title: 'Untitled 3',
      content: '',
      viewMode: 'split',
      createdAt: 9
    });
    expect(result.activeTabId).toBe(result.createdFallback?.id);
    expect(result.tabs).toEqual([result.createdFallback]);
  });

  it('prepares missing close targets as no-ops with the existing counter', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });

    const result = prepareCloseWorkspaceTab([first], first.id, 'missing', 6);

    expect(result.closedTab).toBeNull();
    expect(result.fallbackGenerated).toBe(false);
    expect(result.untitledCounter).toBe(6);
    expect(result.activeTabId).toBe(first.id);
    expect(result.tabs).toEqual([first]);
  });

  it('prepares missing duplicate sources as no-ops', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });

    const result = prepareDuplicateWorkspaceTab([first], first.id, 'missing');

    expect(result.sourceTab).toBeNull();
    expect(result.duplicate).toBeNull();
    expect(result.limitReached).toBe(false);
    expect(result.tabs).toEqual([first]);
  });

  it('reports duplicate max-tab limits without capturing editor snapshots', () => {
    const tabs = Array.from({ length: MAX_DOCUMENT_TABS }, (_, index) => (
      createDocumentTab({ title: `Tab ${index}`, content: `Original ${index}`, now: () => index, random: () => 0.1 })
    ));

    const result = prepareDuplicateWorkspaceTab(tabs, tabs[0].id, tabs[0].id, {
      currentSnapshot: {
        content: 'Should not be captured',
        scrollPos: 99,
        viewMode: 'preview'
      }
    });

    expect(result.limitReached).toBe(true);
    expect(result.duplicate).toBeNull();
    expect(result.tabs[0].content).toBe('Original 0');
    expect(result.tabs).toHaveLength(MAX_DOCUMENT_TABS);
  });

  it('prepares active tab duplicates after capturing the latest editor snapshot', () => {
    const first = createDocumentTab({ title: 'First', content: 'Old', now: () => 1, random: () => 0.1 });

    const result = prepareDuplicateWorkspaceTab([first], first.id, first.id, {
      currentSnapshot: {
        content: 'Fresh editor text',
        scrollPos: 17,
        viewMode: 'editor'
      },
      now: () => 8,
      random: () => 0.8
    });

    expect(result.shouldSwitchToDuplicate).toBe(true);
    expect(result.duplicate).toMatchObject({
      title: 'First (copy)',
      content: 'Fresh editor text',
      viewMode: 'editor',
      createdAt: 8
    });
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'First (copy)']);
    expect(result.tabs[0]).toMatchObject({
      content: 'Fresh editor text',
      scrollPos: 17,
      viewMode: 'editor'
    });
  });

  it('prepares inactive tab duplicates while preserving the active snapshot', () => {
    const first = createDocumentTab({ title: 'First', content: 'One', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', content: 'Two', now: () => 2, random: () => 0.2 });

    const result = prepareDuplicateWorkspaceTab([first, second], first.id, second.id, {
      currentSnapshot: {
        content: 'Updated active tab',
        scrollPos: 12,
        viewMode: 'preview'
      },
      now: () => 7,
      random: () => 0.7
    });

    expect(result.shouldSwitchToDuplicate).toBe(false);
    expect(result.duplicate).toMatchObject({
      title: 'Second (copy)',
      content: 'Two',
      viewMode: 'split',
      createdAt: 7
    });
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'Second', 'Second (copy)']);
    expect(result.tabs[0]).toMatchObject({
      content: 'Updated active tab',
      scrollPos: 12,
      viewMode: 'preview'
    });
  });

  it('prepares tab renames by trimming titles without mutating the source tabs', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const second = createDocumentTab({ title: 'Second', now: () => 2, random: () => 0.2 });
    const source = [first, second];

    const result = prepareRenameWorkspaceTab(source, second.id, '  Renamed file  ');

    expect(result.renamed).toBe(true);
    expect(result.sourceTab?.id).toBe(second.id);
    expect(result.trimmedTitle).toBe('Renamed file');
    expect(source[1].title).toBe('Second');
    expect(result.tabs.map((tab) => tab.title)).toEqual(['First', 'Renamed file']);
  });

  it('prepares blank or missing tab renames as no-ops', () => {
    const first = createDocumentTab({ title: 'First', now: () => 1, random: () => 0.1 });
    const source = [first];

    const blank = prepareRenameWorkspaceTab(source, first.id, '   ');
    const missing = prepareRenameWorkspaceTab(source, 'missing', 'New title');

    expect(blank).toEqual({
      renamed: false,
      sourceTab: first,
      tabs: source,
      trimmedTitle: ''
    });
    expect(missing).toEqual({
      renamed: false,
      sourceTab: null,
      tabs: source,
      trimmedTitle: 'New title'
    });
  });

  it('prepares workspace resets with the default welcome tab shape', () => {
    const result = prepareResetWorkspaceSession('# Welcome', 'Welcome to Markdown', {
      now: () => 5,
      random: () => 0.5
    });

    expect(result.untitledCounter).toBe(0);
    expect(result.tabs).toEqual([result.activeTab]);
    expect(result.activeTabId).toBe(result.activeTab.id);
    expect(result.activeTab).toMatchObject({
      title: 'Welcome to Markdown',
      content: '# Welcome',
      viewMode: 'split',
      scrollPos: 0,
      createdAt: 5
    });
  });
});
