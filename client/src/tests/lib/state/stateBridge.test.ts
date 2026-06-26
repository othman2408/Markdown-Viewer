import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyLineNumberRenderState } from '../../../lib/editor/lineNumbers';
import { cloudState } from '../../../lib/state/cloud.svelte';
import { editorState } from '../../../lib/state/editor.svelte';
import { syncCloudState, syncEditorState, syncModalState, syncUiState, syncWorkspaceState } from '../../../lib/state/stateBridge';
import { modalState } from '../../../lib/state/modals.svelte';
import { uiState } from '../../../lib/state/ui.svelte';
import { workspaceState } from '../../../lib/state/workspace.svelte';

describe('stateBridge', () => {
  beforeEach(() => {
    syncWorkspaceState({
      tabs: [],
      activeTabId: null,
      untitledCounter: 0,
      globalState: {},
      findReplaceDocked: false
    });
    syncCloudState({
      enabled: false,
      csrfToken: null,
      saveInFlight: false,
      saveQueued: false,
      logoutInFlight: false,
      shareRequestSeq: 0
    });
    syncUiState({
      theme: 'light',
      mobileMenuOpen: false,
      viewMode: 'split'
    });
    syncEditorState({
      value: '',
      stats: {
        charCount: 0,
        wordCount: 0,
        readingTimeMinutes: 0
      },
      selection: {
        start: 0,
        end: 0,
        direction: 'none'
      },
      scrollTop: 0,
      scrollLeft: 0,
      viewMode: 'split',
      syncScrollingEnabled: true,
      canUndo: false,
      canRedo: false,
      direction: 'ltr',
      lineNumbers: createEmptyLineNumberRenderState()
    });
    syncModalState({
      activeModalId: null,
      findReplaceOpen: false,
      findReplaceDocked: false,
      findReplaceDrawerOpen: false,
      findReplaceErrorVisible: false,
      findReplaceErrorMessage: '',
      findReplaceMatchCurrent: 0,
      findReplaceMatchTotal: 0,
      findReplaceHasQuery: false,
      findReplaceMatchCase: false,
      findReplaceWholeWord: false,
      findReplaceUseRegex: false,
      findReplaceInSelection: false,
      findReplacePreserveCase: false,
      findReplaceWrapAround: true,
      shareOpen: false,
      shareMode: 'view',
      shareUrl: '',
      shareCopyDisabled: true,
      shareCopySucceeded: false
    });
  });

  it('clones and normalizes workspace state from the workspace payload', () => {
    const tabs = [
      {
        id: 'tab_1',
        title: 'Readme',
        content: '# Hello',
        scrollPos: 42,
        viewMode: 'unknown',
        createdAt: 123
      }
    ];

    syncWorkspaceState({
      tabs: tabs as never,
      activeTabId: 'tab_1',
      untitledCounter: 2,
      globalState: { theme: 'dark' },
      findReplaceDocked: true
    });
    tabs[0].content = 'changed';

    expect(workspaceState.activeTabId).toBe('tab_1');
    expect(workspaceState.tabs[0].content).toBe('# Hello');
    expect(workspaceState.tabs[0].viewMode).toBe('split');
    expect(workspaceState.snapshot.untitledCounter).toBe(2);
    expect(workspaceState.snapshot.findReplaceDocked).toBe(true);
  });

  it('patches cloud and UI state independently', () => {
    syncCloudState({ enabled: true, csrfToken: 'csrf', saveInFlight: true, logoutInFlight: true, shareRequestSeq: 7 });
    syncUiState({ theme: 'dark', mobileMenuOpen: true, viewMode: 'preview' });

    expect(cloudState.snapshot).toMatchObject({
      enabled: true,
      csrfToken: 'csrf',
      saveInFlight: true,
      logoutInFlight: true,
      shareRequestSeq: 7
    });
    expect(uiState.snapshot).toEqual({
      theme: 'dark',
      mobileMenuOpen: true,
      viewMode: 'preview'
    });
  });

  it('patches editor and modal state independently', () => {
    syncEditorState({
      value: '# Hello',
      stats: {
        charCount: 7,
        wordCount: 2,
        readingTimeMinutes: 1
      },
      selection: {
        start: 2,
        end: 5
      },
      viewMode: 'invalid' as never,
      syncScrollingEnabled: false,
      canUndo: true,
      direction: 'rtl',
      lineNumbers: {
        lineCount: 2,
        gutterCh: 3,
        rows: [
          { lineIndex: 0, label: '1', heightPx: 21, active: false },
          { lineIndex: 1, label: '2', heightPx: 42, active: true }
        ]
      }
    });
    syncModalState({
      activeModalId: 'share-modal',
      findReplaceDrawerOpen: true,
      findReplaceErrorVisible: true,
      findReplaceErrorMessage: 'Bad regex',
      findReplaceMatchCurrent: 2,
      findReplaceMatchTotal: 4,
      findReplaceHasQuery: true,
      findReplaceMatchCase: true,
      findReplaceWholeWord: true,
      findReplaceUseRegex: true,
      findReplaceInSelection: true,
      findReplacePreserveCase: true,
      findReplaceWrapAround: false,
      shareOpen: true,
      shareCopySucceeded: true
    });

    expect(editorState.snapshot).toMatchObject({
      value: '# Hello',
      stats: {
        charCount: 7,
        wordCount: 2,
        readingTimeMinutes: 1
      },
      selection: {
        start: 2,
        end: 5,
        direction: 'none'
      },
      viewMode: 'split',
      syncScrollingEnabled: false,
      canUndo: true,
      direction: 'rtl',
      lineNumbers: {
        lineCount: 2,
        gutterCh: 3,
        rows: [
          { lineIndex: 0, label: '1', heightPx: 21, active: false },
          { lineIndex: 1, label: '2', heightPx: 42, active: true }
        ]
      }
    });
    expect(modalState.snapshot).toMatchObject({
      activeModalId: 'share-modal',
      findReplaceDrawerOpen: true,
      findReplaceErrorVisible: true,
      findReplaceErrorMessage: 'Bad regex',
      findReplaceMatchCurrent: 2,
      findReplaceMatchTotal: 4,
      findReplaceHasQuery: true,
      findReplaceMatchCase: true,
      findReplaceWholeWord: true,
      findReplaceUseRegex: true,
      findReplaceInSelection: true,
      findReplacePreserveCase: true,
      findReplaceWrapAround: false,
      shareOpen: true,
      shareCopySucceeded: true
    });
  });
});
