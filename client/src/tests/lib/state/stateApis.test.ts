// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyLineNumberRenderState } from '../../../lib/editor/lineNumbers';
import { cloudState, createDefaultCloudState } from '../../../lib/state/cloud.svelte';
import { editorState } from '../../../lib/state/editor.svelte';
import { createDefaultModalState, modalState } from '../../../lib/state/modals.svelte';
import { closeOpenTabMenu, tabMenuState, toggleOpenTabMenu } from '../../../lib/state/tabMenu.svelte';
import { uiState } from '../../../lib/state/ui.svelte';
import { workspaceState } from '../../../lib/state/workspace.svelte';

function stubElementBox(element: HTMLElement, rect: Partial<DOMRect>, size: { width?: number; height?: number } = {}): void {
  element.getBoundingClientRect = () => ({
    bottom: rect.bottom ?? 0,
    height: rect.height ?? 0,
    left: rect.left ?? 0,
    right: rect.right ?? 0,
    top: rect.top ?? 0,
    width: rect.width ?? 0,
    x: rect.x ?? rect.left ?? 0,
    y: rect.y ?? rect.top ?? 0,
    toJSON: () => ({})
  } as DOMRect);
  Object.defineProperty(element, 'offsetWidth', { configurable: true, value: size.width ?? 0 });
  Object.defineProperty(element, 'offsetHeight', { configurable: true, value: size.height ?? 0 });
}

describe('Svelte state APIs', () => {
  beforeEach(() => {
    cloudState.replace(createDefaultCloudState());
    editorState.replace({
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
    modalState.replace(createDefaultModalState());
    uiState.replace({
      theme: 'light',
      mobileMenuOpen: false,
      viewMode: 'split'
    });
    workspaceState.replace({
      tabs: [],
      activeTabId: null,
      untitledCounter: 0,
      globalState: {},
      findReplaceDocked: false
    });
    closeOpenTabMenu();
  });

  it('updates cloud state and subscribers from replace calls', () => {
    let latest = cloudState.snapshot;
    const unsubscribe = cloudState.subscribe((state) => {
      latest = state;
    });

    cloudState.replace({
      enabled: true,
      csrfToken: 'csrf-token',
      saveQueued: true,
      shareRequestSeq: 4
    });

    expect(cloudState.enabled).toBe(true);
    expect(cloudState.csrfToken).toBe('csrf-token');
    expect(cloudState.saveQueued).toBe(true);
    expect(cloudState.shareRequestSeq).toBe(4);
    expect(latest).toMatchObject({
      enabled: true,
      csrfToken: 'csrf-token',
      saveQueued: true,
      shareRequestSeq: 4
    });

    unsubscribe();
  });

  it('updates editor state while preserving normalized fallbacks', () => {
    editorState.replace({
      value: '# Hello',
      direction: 'rtl',
      selection: {
        start: 2,
        end: 5,
        direction: 'forward'
      }
    });

    expect(editorState.value).toBe('# Hello');
    expect(editorState.direction).toBe('rtl');
    expect(editorState.selection).toEqual({
      start: 2,
      end: 5,
      direction: 'forward'
    });

    editorState.replace({
      scrollTop: 42,
      scrollLeft: 7
    });

    expect(editorState.value).toBe('# Hello');
    expect(editorState.scrollTop).toBe(42);
    expect(editorState.scrollLeft).toBe(7);
  });

  it('updates modal and UI state directly', () => {
    modalState.replace({
      activeModalId: 'share-modal',
      shareOpen: true,
      shareMode: 'edit',
      shareUrl: 'https://example.com/share/token',
      shareCopyDisabled: false
    });
    uiState.replace({
      theme: 'dark',
      mobileMenuOpen: true,
      viewMode: 'preview'
    });

    expect(modalState.activeModalId).toBe('share-modal');
    expect(modalState.shareOpen).toBe(true);
    expect(modalState.shareMode).toBe('edit');
    expect(modalState.shareUrl).toBe('https://example.com/share/token');
    expect(modalState.shareCopyDisabled).toBe(false);
    expect(uiState.theme).toBe('dark');
    expect(uiState.mobileMenuOpen).toBe(true);
    expect(uiState.viewMode).toBe('preview');

    uiState.setMobileMenuOpen(false);
    expect(uiState.mobileMenuOpen).toBe(false);
  });

  it('updates workspace tabs and active-tab patches', () => {
    workspaceState.replace({
      tabs: [
        {
          id: 'tab_one',
          title: 'One',
          content: '# One',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Two',
          content: '# Two',
          scrollPos: 4,
          viewMode: 'preview',
          createdAt: 2
        }
      ],
      activeTabId: 'tab_one',
      untitledCounter: 2,
      globalState: { theme: 'dark' },
      findReplaceDocked: true
    });
    workspaceState.setActiveTab('tab_two');
    workspaceState.updateActiveTab({
      content: '# Updated',
      scrollPos: 12,
      viewMode: 'editor'
    });

    expect(workspaceState.activeTabId).toBe('tab_two');
    expect(workspaceState.activeTab?.content).toBe('# Updated');
    expect(workspaceState.snapshot.tabs).toMatchObject([
      {
        id: 'tab_one',
        content: '# One'
      },
      {
        id: 'tab_two',
        content: '# Updated',
        scrollPos: 12,
        viewMode: 'editor'
      }
    ]);
  });

  it('opens and closes tab menus from the state action helpers', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    const button = document.createElement('button');
    const dropdown = document.createElement('div');
    stubElementBox(button, { right: 260, bottom: 40, top: 12 });
    stubElementBox(dropdown, {}, { width: 120, height: 90 });

    toggleOpenTabMenu({
      button,
      dropdown,
      menuId: 'mobile-tab-menu-tab_two',
      mobile: true,
      tabId: 'tab_two'
    });

    expect(tabMenuState.snapshot).toMatchObject({
      menuId: 'mobile-tab-menu-tab_two',
      tabId: 'tab_two',
      mobile: true,
      position: {
        top: 44,
        left: 140
      }
    });

    toggleOpenTabMenu({
      button,
      dropdown,
      menuId: 'mobile-tab-menu-tab_two',
      mobile: true,
      tabId: 'tab_two'
    });

    expect(tabMenuState.snapshot).toBeNull();
  });
});
