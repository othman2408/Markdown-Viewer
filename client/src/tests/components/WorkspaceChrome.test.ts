// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WorkspaceChrome from '../../components/WorkspaceChrome.svelte';
import TabMenuController from '../../components/tabs/TabMenuController.svelte';
import { createEmptyLineNumberRenderState } from '../../lib/editor/lineNumbers';
import { editorState } from '../../lib/state/editor.svelte';
import { closeOpenTabMenu } from '../../lib/state/tabMenu.svelte';
import { workspaceState } from '../../lib/state/workspace.svelte';

const MARKDOWN_ACTIONS = [
  'undo',
  'redo',
  'clear-formatting',
  'bold',
  'strike',
  'italic',
  'quote',
  'title-case',
  'uppercase',
  'lowercase',
  'align-left',
  'align-center',
  'align-right',
  'heading',
  'unordered-list',
  'ordered-list',
  'horizontal-rule',
  'link',
  'reference',
  'image',
  'inline-code',
  'code-block',
  'terminal-block',
  'table',
  'date-time',
  'emoji',
  'symbols',
  'alert',
  'fullscreen',
  'find',
  'help',
  'info'
];

function resetEditorState() {
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
}

function resetWorkspaceState() {
  workspaceState.replace({
    tabs: [],
    activeTabId: null,
    untitledCounter: 0,
    globalState: {},
    findReplaceDocked: false
  });
}

function flushAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

describe('WorkspaceChrome', () => {
  beforeEach(() => {
    resetEditorState();
    resetWorkspaceState();
  });

  afterEach(() => {
    cleanup();
    delete window.markdownViewerToolbar;
    delete window.markdownViewerTabs;
    closeOpenTabMenu();
    resetEditorState();
    resetWorkspaceState();
  });

  it('keeps the tab bar contract stable', () => {
    const { container } = render(WorkspaceChrome);
    const tabBar = container.querySelector<HTMLDivElement>('#tab-bar');
    const tabList = container.querySelector<HTMLDivElement>('#tab-list');
    const newTabButton = container.querySelector<HTMLButtonElement>('#tab-new-btn');
    const resetButton = container.querySelector<HTMLButtonElement>('#tab-reset-btn');

    expect(tabBar?.classList.contains('tab-bar')).toBe(true);
    expect(tabList?.getAttribute('role')).toBe('tablist');
    expect(tabList?.getAttribute('aria-label')).toBe('Document tabs');
    expect(newTabButton?.classList.contains('tab-new-btn')).toBe(true);
    expect(newTabButton?.getAttribute('aria-label')).toBe('Open new tab');
    expect(resetButton?.classList.contains('tab-reset-btn')).toBe(true);
    expect(resetButton?.getAttribute('aria-label')).toBe('Reset all files');
  });

  it('lets Svelte own desktop tab overflow controls', async () => {
    workspaceState.replace({
      activeTabId: 'tab_two',
      untitledCounter: 3,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_one',
          title: 'First',
          content: '# First',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Second',
          content: '# Second',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 2
        },
        {
          id: 'tab_three',
          title: 'Third',
          content: '# Third',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 3
        }
      ]
    });

    const { container } = render(WorkspaceChrome);
    const tabBar = container.querySelector<HTMLDivElement>('#tab-bar');
    const tabList = container.querySelector<HTMLDivElement>('#tab-list');
    const scrollLeft = container.querySelector<HTMLButtonElement>('.tab-scroll-left');
    const scrollRight = container.querySelector<HTMLButtonElement>('.tab-scroll-right');

    expect(tabBar).not.toBeNull();
    expect(tabList).not.toBeNull();
    expect(scrollLeft?.getAttribute('aria-label')).toBe('Scroll tabs left');
    expect(scrollRight?.getAttribute('aria-label')).toBe('Scroll tabs right');

    const list = tabList as HTMLDivElement;
    Object.defineProperty(list, 'clientWidth', { configurable: true, value: 100 });
    Object.defineProperty(list, 'scrollWidth', { configurable: true, value: 300 });
    Object.defineProperty(list, 'scrollLeft', { configurable: true, writable: true, value: 0 });
    list.scrollBy = ((options?: number | ScrollToOptions) => {
      const left = typeof options === 'number' ? options : options?.left;
      list.scrollLeft += Number(left || 0);
      list.dispatchEvent(new Event('scroll'));
    }) as typeof list.scrollBy;

    list.dispatchEvent(new Event('scroll'));
    await flushAnimationFrame();

    expect(tabBar?.classList.contains('has-overflow-left')).toBe(false);
    expect(tabBar?.classList.contains('has-overflow-right')).toBe(true);

    await fireEvent.click(scrollRight as HTMLButtonElement);
    await flushAnimationFrame();

    expect(list.scrollLeft).toBe(200);
    expect(tabBar?.classList.contains('has-overflow-left')).toBe(true);
    expect(tabBar?.classList.contains('has-overflow-right')).toBe(false);

    await fireEvent.click(scrollLeft as HTMLButtonElement);
    await flushAnimationFrame();

    expect(list.scrollLeft).toBe(0);
    expect(tabBar?.classList.contains('has-overflow-left')).toBe(false);
    expect(tabBar?.classList.contains('has-overflow-right')).toBe(true);

    await fireEvent.wheel(list, { deltaY: 40, deltaX: 0 });
    await flushAnimationFrame();

    expect(list.scrollLeft).toBe(40);
    expect(tabBar?.classList.contains('has-overflow-left')).toBe(true);
    expect(tabBar?.classList.contains('has-overflow-right')).toBe(true);
  });

  it('renders desktop tabs from workspace state while keeping app action hooks', () => {
    workspaceState.replace({
      activeTabId: 'tab_two',
      untitledCounter: 2,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_one',
          title: 'First',
          content: '# First',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Second',
          content: '# Second',
          scrollPos: 4,
          viewMode: 'preview',
          createdAt: 2
        }
      ]
    });

    const { container } = render(WorkspaceChrome);
    const tabs = Array.from(container.querySelectorAll<HTMLDivElement>('#tab-list .tab-item'));
    const menuButton = tabs[1].querySelector<HTMLButtonElement>('.tab-menu-btn');
    const menu = container.querySelector<HTMLDivElement>('#desktop-tab-menu-tab_two');

    expect(tabs).toHaveLength(2);
    expect(tabs.map((tab) => tab.querySelector('.tab-title')?.textContent)).toEqual(['First', 'Second']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[0].getAttribute('tabindex')).toBe('-1');
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('tabindex')).toBe('0');
    expect(menuButton?.dataset.tabId).toBe('tab_two');
    expect(menuButton?.getAttribute('aria-controls')).toBe('desktop-tab-menu-tab_two');
    expect(menu?.dataset.tabId).toBe('tab_two');
    expect(Array.from(menu?.querySelectorAll<HTMLButtonElement>('[data-action]') || []).map((button) => button.dataset.action))
      .toEqual(['rename', 'duplicate', 'delete']);
  });

  it('dispatches desktop tab chrome actions through the command bridge', async () => {
    workspaceState.replace({
      activeTabId: 'tab_two',
      untitledCounter: 2,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_one',
          title: 'First',
          content: '# First',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Second',
          content: '# Second',
          scrollPos: 4,
          viewMode: 'preview',
          createdAt: 2
        }
      ]
    });
    const calls: string[] = [];
    window.markdownViewerTabs = {
      createTab(closeMobileAfterCreate) {
        calls.push(`create:${String(Boolean(closeMobileAfterCreate))}`);
      },
      resetTabs(closeMobileAfterReset) {
        calls.push(`reset:${String(Boolean(closeMobileAfterReset))}`);
      },
      runMenuAction(tabId, action, isMobileMenu) {
        calls.push(`menu:${tabId}:${action}:${String(Boolean(isMobileMenu))}`);
      },
      selectTab(tabId, closeMobileAfterSelect) {
        calls.push(`select:${tabId}:${String(Boolean(closeMobileAfterSelect))}`);
      }
    };

    const { container } = render(WorkspaceChrome);
    const firstTabTitle = container.querySelector<HTMLSpanElement>('.tab-item[data-tab-id="tab_one"] .tab-title');
    const secondMenuButton = container.querySelector<HTMLButtonElement>('.tab-item[data-tab-id="tab_two"] .tab-menu-btn');
    const duplicateAction = container.querySelector<HTMLButtonElement>('#desktop-tab-menu-tab_two [data-action="duplicate"]');
    const newTabButton = container.querySelector<HTMLButtonElement>('#tab-new-btn');
    const resetButton = container.querySelector<HTMLButtonElement>('#tab-reset-btn');

    expect(firstTabTitle).not.toBeNull();
    expect(secondMenuButton).not.toBeNull();
    expect(duplicateAction).not.toBeNull();
    expect(newTabButton).not.toBeNull();
    expect(resetButton).not.toBeNull();

    await fireEvent.click(firstTabTitle as HTMLSpanElement);
    await fireEvent.click(secondMenuButton as HTMLButtonElement);
    expect(secondMenuButton?.classList.contains('open')).toBe(true);
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#desktop-tab-menu-tab_two')?.classList.contains('open')).toBe(true);

    await fireEvent.click(duplicateAction as HTMLButtonElement);
    expect(secondMenuButton?.classList.contains('open')).toBe(false);
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(newTabButton as HTMLButtonElement);
    await fireEvent.click(resetButton as HTMLButtonElement);

    expect(calls).toEqual([
      'select:tab_one:false',
      'menu:tab_two:duplicate:false',
      'create:false',
      'reset:false'
    ]);
  });

  it('lets Svelte own desktop tab menu open state and outside close', async () => {
    workspaceState.replace({
      activeTabId: 'tab_two',
      untitledCounter: 2,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_one',
          title: 'First',
          content: '# First',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Second',
          content: '# Second',
          scrollPos: 4,
          viewMode: 'preview',
          createdAt: 2
        }
      ]
    });

    render(TabMenuController);
    const { container } = render(WorkspaceChrome);
    const secondMenuButton = container.querySelector<HTMLButtonElement>('.tab-item[data-tab-id="tab_two"] .tab-menu-btn');
    const menu = container.querySelector<HTMLDivElement>('#desktop-tab-menu-tab_two');

    expect(secondMenuButton).not.toBeNull();
    expect(menu).not.toBeNull();
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.classList.contains('open')).toBe(false);

    await fireEvent.click(secondMenuButton as HTMLButtonElement);

    expect(secondMenuButton?.classList.contains('open')).toBe(true);
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(menu?.classList.contains('open')).toBe(true);
    expect(menu?.getAttribute('style')).toContain('right: auto');

    await fireEvent.click(document.body);

    expect(secondMenuButton?.classList.contains('open')).toBe(false);
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(menu?.classList.contains('open')).toBe(false);
  });

  it('lets Svelte own desktop tab keyboard navigation', async () => {
    workspaceState.replace({
      activeTabId: 'tab_two',
      untitledCounter: 3,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_one',
          title: 'First',
          content: '# First',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Second',
          content: '# Second',
          scrollPos: 4,
          viewMode: 'preview',
          createdAt: 2
        },
        {
          id: 'tab_three',
          title: 'Third',
          content: '# Third',
          scrollPos: 8,
          viewMode: 'editor',
          createdAt: 3
        }
      ]
    });
    const selectedTabs: string[] = [];
    window.markdownViewerTabs = {
      selectTab(tabId, closeMobileAfterSelect) {
        selectedTabs.push(`${tabId}:${String(Boolean(closeMobileAfterSelect))}`);
      }
    };

    const { container } = render(WorkspaceChrome);
    const tabList = container.querySelector<HTMLDivElement>('#tab-list');
    const tabs = Array.from(container.querySelectorAll<HTMLDivElement>('#tab-list .tab-item'));

    expect(tabList).not.toBeNull();
    expect(tabs).toHaveLength(3);

    tabs[1].focus();
    expect(document.activeElement).toBe(tabs[1]);

    expect(await fireEvent.keyDown(tabList as HTMLDivElement, { key: 'ArrowRight' })).toBe(false);
    expect(document.activeElement).toBe(tabs[2]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0]);

    expect(await fireEvent.keyDown(tabList as HTMLDivElement, { key: 'Home' })).toBe(false);
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);

    expect(await fireEvent.keyDown(tabList as HTMLDivElement, { key: 'Enter' })).toBe(false);
    expect(selectedTabs).toEqual(['tab_one:false']);
  });

  it('lets Svelte own desktop tab drag and drop dispatch', async () => {
    workspaceState.replace({
      activeTabId: 'tab_two',
      untitledCounter: 3,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_one',
          title: 'First',
          content: '# First',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_two',
          title: 'Second',
          content: '# Second',
          scrollPos: 4,
          viewMode: 'preview',
          createdAt: 2
        },
        {
          id: 'tab_three',
          title: 'Third',
          content: '# Third',
          scrollPos: 8,
          viewMode: 'editor',
          createdAt: 3
        }
      ]
    });
    const reorders: string[] = [];
    window.markdownViewerTabs = {
      reorderTabs(draggedTabId, targetTabId) {
        reorders.push(`${draggedTabId}:${targetTabId}`);
      }
    };

    const { container } = render(WorkspaceChrome);
    const tabs = Array.from(container.querySelectorAll<HTMLDivElement>('#tab-list .tab-item'));

    expect(tabs).toHaveLength(3);

    await fireEvent.dragStart(tabs[0]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(tabs[0].classList.contains('dragging')).toBe(true);

    await fireEvent.dragOver(tabs[2]);
    expect(tabs[2].classList.contains('drag-over')).toBe(true);

    await fireEvent.drop(tabs[2]);
    expect(tabs[2].classList.contains('drag-over')).toBe(false);
    expect(reorders).toEqual(['tab_one:tab_three']);

    await fireEvent.dragEnd(tabs[0]);
    expect(tabs[0].classList.contains('dragging')).toBe(false);
  });

  it('keeps markdown toolbar actions available for Svelte-owned command dispatch', () => {
    const { container } = render(WorkspaceChrome);
    const toolbar = container.querySelector<HTMLDivElement>('#markdown-format-toolbar');
    const actions = Array.from(container.querySelectorAll<HTMLElement>('[data-md-action]'))
      .map((node) => node.dataset.mdAction);
    const headingButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-md-action="heading"]'));
    const directionToggle = container.querySelector<HTMLButtonElement>('#direction-toggle');

    expect(toolbar?.getAttribute('role')).toBe('toolbar');
    expect(toolbar?.getAttribute('aria-label')).toBe('Markdown formatting toolbar');
    expect(Array.from(new Set(actions))).toEqual(MARKDOWN_ACTIONS);
    expect(headingButtons.map((button) => button.dataset.mdLevel)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(directionToggle?.getAttribute('aria-pressed')).toBe('false');
    expect(directionToggle?.textContent).toBe('L');
  });

  it('dispatches markdown toolbar clicks through the command bridge', async () => {
    const dispatchedCommands: Array<{ action: string; level: string | undefined }> = [];
    let directionToggles = 0;
    window.markdownViewerToolbar = {
      runMarkdownTool(action, button) {
        dispatchedCommands.push({
          action,
          level: button.dataset.mdLevel
        });
      },
      toggleContentDirection() {
        directionToggles += 1;
      }
    };

    const { container } = render(WorkspaceChrome);
    const boldButton = container.querySelector<HTMLButtonElement>('[data-md-action="bold"]');
    const headingThreeButton = container.querySelector<HTMLButtonElement>('[data-md-action="heading"][data-md-level="3"]');
    const directionToggle = container.querySelector<HTMLButtonElement>('#direction-toggle');

    expect(boldButton).not.toBeNull();
    expect(headingThreeButton).not.toBeNull();
    expect(directionToggle).not.toBeNull();

    const boldMouseDown = await fireEvent.mouseDown(boldButton as HTMLButtonElement);
    await fireEvent.click(boldButton as HTMLButtonElement);
    await fireEvent.click(headingThreeButton as HTMLButtonElement);
    await fireEvent.click(directionToggle as HTMLButtonElement);

    expect(boldMouseDown).toBe(false);
    expect(dispatchedCommands).toEqual([
      {
        action: 'bold',
        level: undefined
      },
      {
        action: 'heading',
        level: '3'
      }
    ]);
    expect(directionToggles).toBe(1);
  });

  it('lets Svelte own direction, undo, and redo toolbar visual state', async () => {
    const { container } = render(WorkspaceChrome);
    const undoButton = container.querySelector<HTMLButtonElement>('[data-md-action="undo"]');
    const redoButton = container.querySelector<HTMLButtonElement>('[data-md-action="redo"]');
    const directionToggle = container.querySelector<HTMLButtonElement>('#direction-toggle');

    expect(undoButton?.disabled).toBe(true);
    expect(undoButton?.classList.contains('disabled')).toBe(true);
    expect(redoButton?.disabled).toBe(true);
    expect(redoButton?.classList.contains('disabled')).toBe(true);
    expect(directionToggle?.textContent).toBe('L');
    expect(directionToggle?.title).toBe('Switch to RTL');
    expect(directionToggle?.getAttribute('aria-pressed')).toBe('false');

    editorState.replace({
      canUndo: true,
      canRedo: true,
      direction: 'rtl'
    });
    await tick();

    expect(undoButton?.disabled).toBe(false);
    expect(undoButton?.classList.contains('disabled')).toBe(false);
    expect(redoButton?.disabled).toBe(false);
    expect(redoButton?.classList.contains('disabled')).toBe(false);
    expect(directionToggle?.textContent).toBe('R');
    expect(directionToggle?.title).toBe('Switch to LTR');
    expect(directionToggle?.getAttribute('aria-pressed')).toBe('true');
  });
});
