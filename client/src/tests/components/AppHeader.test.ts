// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AppHeader from '../../components/AppHeader.svelte';
import { createEmptyLineNumberRenderState } from '../../lib/editor/lineNumbers';
import { cloudState } from '../../lib/state/cloud.svelte';
import { editorState } from '../../lib/state/editor.svelte';
import { closeOpenTabMenu } from '../../lib/state/tabMenu.svelte';
import { uiState } from '../../lib/state/ui.svelte';
import { workspaceState } from '../../lib/state/workspace.svelte';

function resetState() {
  cloudState.replace({
    enabled: false,
    csrfToken: null,
    saveInFlight: false,
    saveQueued: false,
    logoutInFlight: false,
    shareRequestSeq: 0
  });
  uiState.replace({
    theme: 'light',
    mobileMenuOpen: false,
    viewMode: 'split'
  });
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
  workspaceState.replace({
    tabs: [],
    activeTabId: null,
    untitledCounter: 0,
    globalState: {},
    findReplaceDocked: false
  });
}

describe('AppHeader', () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    cleanup();
    delete window.markdownViewerAuth;
    delete window.markdownViewerHeaderActions;
    delete window.markdownViewerTabs;
    delete window.markdownViewerSyncScroll;
    delete window.markdownViewerTheme;
    delete window.markdownViewerViewMode;
    closeOpenTabMenu();
    resetState();
  });

  it('lets Svelte own logout button visibility and busy state from cloud state', async () => {
    const { container } = render(AppHeader);
    const desktopLogout = container.querySelector<HTMLButtonElement>('#logout-button');
    const mobileLogout = container.querySelector<HTMLButtonElement>('#mobile-logout-button');

    expect(desktopLogout).not.toBeNull();
    expect(mobileLogout).not.toBeNull();
    expect(desktopLogout?.hidden).toBe(true);
    expect(mobileLogout?.hidden).toBe(true);

    cloudState.replace({
      enabled: true,
      csrfToken: 'csrf',
      saveInFlight: false,
      saveQueued: false,
      logoutInFlight: false,
      shareRequestSeq: 0
    });
    await tick();

    expect(desktopLogout?.hidden).toBe(false);
    expect(mobileLogout?.hidden).toBe(false);
    expect(desktopLogout?.disabled).toBe(false);
    expect(mobileLogout?.disabled).toBe(false);
    expect(desktopLogout?.getAttribute('aria-busy')).toBe('false');

    cloudState.replace({
      enabled: true,
      csrfToken: 'csrf',
      saveInFlight: false,
      saveQueued: false,
      logoutInFlight: true,
      shareRequestSeq: 0
    });
    await tick();

    expect(desktopLogout?.disabled).toBe(true);
    expect(mobileLogout?.disabled).toBe(true);
    expect(desktopLogout?.getAttribute('aria-busy')).toBe('true');
    expect(mobileLogout?.getAttribute('aria-busy')).toBe('true');
  });

  it('dispatches desktop and mobile logout through the auth bridge', async () => {
    cloudState.replace({
      enabled: true,
      csrfToken: 'csrf',
      saveInFlight: false,
      saveQueued: false,
      logoutInFlight: false,
      shareRequestSeq: 0
    });
    const calls: string[] = [];
    window.markdownViewerAuth = {
      logout(variant, event) {
        calls.push(`${variant || 'desktop'}:${event instanceof Event}`);
      }
    };

    const { container } = render(AppHeader);
    const desktopLogout = container.querySelector<HTMLButtonElement>('#logout-button');
    const mobileLogout = container.querySelector<HTMLButtonElement>('#mobile-logout-button');

    expect(desktopLogout).not.toBeNull();
    expect(mobileLogout).not.toBeNull();

    await fireEvent.click(desktopLogout as HTMLButtonElement);
    await fireEvent.click(mobileLogout as HTMLButtonElement);

    expect(calls).toEqual(['desktop:true', 'mobile:true']);
  });

  it('dispatches desktop and mobile copy/import/export/share actions through the header bridge', async () => {
    const calls: string[] = [];
    window.markdownViewerHeaderActions = {
      run(action, variant, event) {
        calls.push(`${variant || 'desktop'}:${action}:${event instanceof Event}`);
        event?.preventDefault();
      }
    };

    const { container } = render(AppHeader);
    const desktopImportFile = container.querySelector<HTMLAnchorElement>('#import-from-file');
    const desktopImportGithub = container.querySelector<HTMLAnchorElement>('#import-from-github');
    const desktopCopy = container.querySelector<HTMLButtonElement>('#copy-markdown-button');
    const desktopExportMd = container.querySelector<HTMLAnchorElement>('#export-md');
    const desktopExportHtml = container.querySelector<HTMLAnchorElement>('#export-html');
    const desktopExportPdf = container.querySelector<HTMLAnchorElement>('#export-pdf');
    const desktopExportPng = container.querySelector<HTMLAnchorElement>('#export-png');
    const desktopFiles = container.querySelector<HTMLButtonElement>('#files-button');
    const desktopShare = container.querySelector<HTMLButtonElement>('#share-button');
    const mobileExportMd = container.querySelector<HTMLButtonElement>('#mobile-export-md');
    const mobileExportHtml = container.querySelector<HTMLButtonElement>('#mobile-export-html');
    const mobileExportPdf = container.querySelector<HTMLButtonElement>('#mobile-export-pdf');
    const mobileExportPng = container.querySelector<HTMLButtonElement>('#mobile-export-png');
    const mobileImportFile = container.querySelector<HTMLButtonElement>('#mobile-import-button');
    const mobileImportGithub = container.querySelector<HTMLButtonElement>('#mobile-import-github-button');
    const mobileCopy = container.querySelector<HTMLButtonElement>('#mobile-copy-markdown');
    const mobileFiles = container.querySelector<HTMLButtonElement>('#mobile-files-button');
    const mobileShare = container.querySelector<HTMLButtonElement>('#mobile-share-button');

    expect(desktopImportFile).not.toBeNull();
    expect(desktopImportGithub).not.toBeNull();
    expect(desktopCopy).not.toBeNull();
    expect(desktopExportMd).not.toBeNull();
    expect(desktopExportHtml).not.toBeNull();
    expect(desktopExportPdf).not.toBeNull();
    expect(desktopExportPng).not.toBeNull();
    expect(desktopFiles).not.toBeNull();
    expect(desktopShare).not.toBeNull();
    expect(mobileExportMd).not.toBeNull();
    expect(mobileExportHtml).not.toBeNull();
    expect(mobileExportPdf).not.toBeNull();
    expect(mobileExportPng).not.toBeNull();
    expect(mobileImportFile).not.toBeNull();
    expect(mobileImportGithub).not.toBeNull();
    expect(mobileCopy).not.toBeNull();
    expect(mobileFiles).not.toBeNull();
    expect(mobileShare).not.toBeNull();

    await fireEvent.click(desktopCopy as HTMLButtonElement);
    await fireEvent.click(desktopExportMd as HTMLAnchorElement);
    await fireEvent.click(desktopExportHtml as HTMLAnchorElement);
    await fireEvent.click(desktopExportPdf as HTMLAnchorElement);
    await fireEvent.click(desktopExportPng as HTMLAnchorElement);
    await fireEvent.click(desktopImportFile as HTMLAnchorElement);
    await fireEvent.click(desktopImportGithub as HTMLAnchorElement);
    await fireEvent.click(desktopFiles as HTMLButtonElement);
    await fireEvent.click(desktopShare as HTMLButtonElement);
    await fireEvent.click(mobileCopy as HTMLButtonElement);
    await fireEvent.click(mobileExportMd as HTMLButtonElement);
    await fireEvent.click(mobileExportHtml as HTMLButtonElement);
    await fireEvent.click(mobileExportPdf as HTMLButtonElement);
    await fireEvent.click(mobileExportPng as HTMLButtonElement);
    await fireEvent.click(mobileImportFile as HTMLButtonElement);
    await fireEvent.click(mobileImportGithub as HTMLButtonElement);
    await fireEvent.click(mobileFiles as HTMLButtonElement);
    await fireEvent.click(mobileShare as HTMLButtonElement);

    expect(calls).toEqual([
      'desktop:copyMarkdown:true',
      'desktop:exportMarkdown:true',
      'desktop:exportHtml:true',
      'desktop:exportPdf:true',
      'desktop:exportPng:true',
      'desktop:importFile:true',
      'desktop:importGithub:true',
      'desktop:files:true',
      'desktop:share:true',
      'mobile:copyMarkdown:true',
      'mobile:exportMarkdown:true',
      'mobile:exportHtml:true',
      'mobile:exportPdf:true',
      'mobile:exportPng:true',
      'mobile:importFile:true',
      'mobile:importGithub:true',
      'mobile:files:true',
      'mobile:share:true'
    ]);
  });

  it('lets Svelte own mobile menu open and close state', async () => {
    const { container } = render(AppHeader);
    const toggle = container.querySelector<HTMLButtonElement>('#mobile-menu-toggle');
    const close = container.querySelector<HTMLButtonElement>('#close-mobile-menu');
    const panel = container.querySelector<HTMLDivElement>('#mobile-menu-panel');
    const overlay = container.querySelector<HTMLDivElement>('#mobile-menu-overlay');

    expect(toggle).not.toBeNull();
    expect(close).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(overlay).not.toBeNull();
    expect(panel?.classList.contains('active')).toBe(false);
    expect(overlay?.classList.contains('active')).toBe(false);

    await fireEvent.click(toggle as HTMLButtonElement);
    expect(uiState.mobileMenuOpen).toBe(true);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.classList.contains('active')).toBe(true);
    expect(overlay?.classList.contains('active')).toBe(true);

    await fireEvent.click(close as HTMLButtonElement);
    expect(uiState.mobileMenuOpen).toBe(false);
    expect(panel?.classList.contains('active')).toBe(false);

    uiState.replace({ theme: 'light', mobileMenuOpen: true, viewMode: 'split' });
    await tick();
    expect(panel?.classList.contains('active')).toBe(true);
    await fireEvent.click(overlay as HTMLDivElement);
    expect(uiState.mobileMenuOpen).toBe(false);
    expect(overlay?.classList.contains('active')).toBe(false);

    uiState.replace({ theme: 'light', mobileMenuOpen: true, viewMode: 'split' });
    await tick();
    await fireEvent.keyDown(overlay as HTMLDivElement, { key: 'Escape' });
    expect(uiState.mobileMenuOpen).toBe(false);
  });

  it('lets Svelte own desktop and mobile view mode pressed state', async () => {
    const { container } = render(AppHeader);
    const desktopEditor = container.querySelector<HTMLButtonElement>('.view-toggle-btn[data-view-mode="editor"]');
    const desktopSplit = container.querySelector<HTMLButtonElement>('.view-toggle-btn[data-view-mode="split"]');
    const desktopPreview = container.querySelector<HTMLButtonElement>('.view-toggle-btn[data-view-mode="preview"]');
    const mobileEditor = container.querySelector<HTMLButtonElement>('.mobile-view-mode-btn[data-mode="editor"]');
    const mobileSplit = container.querySelector<HTMLButtonElement>('.mobile-view-mode-btn[data-mode="split"]');
    const mobilePreview = container.querySelector<HTMLButtonElement>('.mobile-view-mode-btn[data-mode="preview"]');

    expect(desktopSplit?.classList.contains('is-active')).toBe(true);
    expect(desktopSplit?.getAttribute('aria-pressed')).toBe('true');
    expect(mobileSplit?.classList.contains('active')).toBe(true);
    expect(mobileSplit?.getAttribute('aria-pressed')).toBe('true');

    uiState.replace({ theme: 'light', mobileMenuOpen: false, viewMode: 'preview' });
    await tick();

    expect(desktopEditor?.classList.contains('is-active')).toBe(false);
    expect(desktopSplit?.classList.contains('is-active')).toBe(false);
    expect(desktopPreview?.classList.contains('is-active')).toBe(true);
    expect(desktopPreview?.getAttribute('aria-pressed')).toBe('true');
    expect(mobileEditor?.classList.contains('active')).toBe(false);
    expect(mobileSplit?.classList.contains('active')).toBe(false);
    expect(mobilePreview?.classList.contains('active')).toBe(true);
    expect(mobilePreview?.getAttribute('aria-pressed')).toBe('true');
  });

  it('dispatches desktop and mobile view mode selections through the command bridge', async () => {
    const calls: string[] = [];
    window.markdownViewerViewMode = {
      select(mode, variant) {
        calls.push(`${variant || 'desktop'}:${mode}`);
      }
    };

    const { container } = render(AppHeader);
    const desktopPreview = container.querySelector<HTMLButtonElement>('.view-toggle-btn[data-view-mode="preview"]');
    const mobileEditor = container.querySelector<HTMLButtonElement>('.mobile-view-mode-btn[data-mode="editor"]');

    expect(desktopPreview).not.toBeNull();
    expect(mobileEditor).not.toBeNull();

    await fireEvent.click(desktopPreview as HTMLButtonElement);
    await fireEvent.click(mobileEditor as HTMLButtonElement);

    expect(calls).toEqual(['desktop:preview', 'mobile:editor']);
  });

  it('lets Svelte own theme icons from UI state', async () => {
    const { container } = render(AppHeader);
    const desktopIcon = container.querySelector<HTMLElement>('#theme-toggle i');
    const mobileIcon = container.querySelector<HTMLElement>('#mobile-theme-toggle i');

    expect(desktopIcon?.classList.contains('bi-moon')).toBe(true);
    expect(mobileIcon?.classList.contains('bi-moon')).toBe(true);

    uiState.replace({ theme: 'dark', mobileMenuOpen: false, viewMode: 'split' });
    await tick();

    expect(desktopIcon?.classList.contains('bi-sun')).toBe(true);
    expect(mobileIcon?.classList.contains('bi-sun')).toBe(true);
  });

  it('dispatches desktop and mobile theme toggles through the command bridge', async () => {
    const calls: string[] = [];
    window.markdownViewerTheme = {
      toggle(variant) {
        calls.push(variant || 'desktop');
      }
    };

    const { container } = render(AppHeader);
    const desktopTheme = container.querySelector<HTMLButtonElement>('#theme-toggle');
    const mobileTheme = container.querySelector<HTMLButtonElement>('#mobile-theme-toggle');

    expect(desktopTheme).not.toBeNull();
    expect(mobileTheme).not.toBeNull();

    await fireEvent.click(desktopTheme as HTMLButtonElement);
    await fireEvent.click(mobileTheme as HTMLButtonElement);

    expect(calls).toEqual(['desktop', 'mobile']);
  });

  it('lets Svelte own desktop and mobile document stats', async () => {
    const { container } = render(AppHeader);

    editorState.replace({
      stats: {
        charCount: 1234,
        wordCount: 567,
        readingTimeMinutes: 3
      }
    });
    await tick();

    expect(container.querySelector('#reading-time')?.textContent).toBe('3');
    expect(container.querySelector('#word-count')?.textContent).toBe((567).toLocaleString());
    expect(container.querySelector('#char-count')?.textContent).toBe((1234).toLocaleString());
    expect(container.querySelector('#mobile-reading-time')?.textContent).toBe('3');
    expect(container.querySelector('#mobile-word-count')?.textContent).toBe((567).toLocaleString());
    expect(container.querySelector('#mobile-char-count')?.textContent).toBe((1234).toLocaleString());
  });

  it('lets Svelte own sync scroll visual state and split-view availability', async () => {
    const { container } = render(AppHeader);
    const desktopSync = container.querySelector<HTMLButtonElement>('#toggle-sync');
    const mobileSync = container.querySelector<HTMLButtonElement>('#mobile-toggle-sync');

    expect(desktopSync?.classList.contains('sync-active')).toBe(true);
    expect(desktopSync?.textContent).toContain('Sync Off');
    expect(desktopSync?.disabled).toBe(false);
    expect(mobileSync?.classList.contains('sync-active')).toBe(true);
    expect(mobileSync?.textContent).toContain('Sync Off');
    expect(mobileSync?.disabled).toBe(false);

    editorState.replace({ syncScrollingEnabled: false });
    await tick();

    expect(desktopSync?.classList.contains('sync-enabled')).toBe(true);
    expect(desktopSync?.classList.contains('sync-active')).toBe(false);
    expect(desktopSync?.textContent).toContain('Sync On');
    expect(mobileSync?.classList.contains('sync-enabled')).toBe(true);
    expect(mobileSync?.textContent).toContain('Sync On');

    uiState.replace({ theme: 'light', mobileMenuOpen: false, viewMode: 'preview' });
    await tick();

    expect(desktopSync?.disabled).toBe(true);
    expect(desktopSync?.getAttribute('aria-disabled')).toBe('true');
    expect(mobileSync?.disabled).toBe(true);
    expect(mobileSync?.getAttribute('aria-disabled')).toBe('true');
  });

  it('dispatches desktop and mobile sync scroll toggles through the command bridge', async () => {
    const calls: string[] = [];
    window.markdownViewerSyncScroll = {
      toggle(variant) {
        calls.push(variant || 'desktop');
      }
    };

    const { container } = render(AppHeader);
    const desktopSync = container.querySelector<HTMLButtonElement>('#toggle-sync');
    const mobileSync = container.querySelector<HTMLButtonElement>('#mobile-toggle-sync');

    expect(desktopSync).not.toBeNull();
    expect(mobileSync).not.toBeNull();

    await fireEvent.click(desktopSync as HTMLButtonElement);
    await fireEvent.click(mobileSync as HTMLButtonElement);

    expect(calls).toEqual(['desktop', 'mobile']);
  });

  it('renders mobile tabs from workspace state while keeping app action hooks', () => {
    workspaceState.replace({
      activeTabId: 'tab_mobile_two',
      untitledCounter: 2,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_mobile_one',
          title: 'Mobile One',
          content: '# One',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_mobile_two',
          title: 'Mobile Two',
          content: '# Two',
          scrollPos: 0,
          viewMode: 'editor',
          createdAt: 2
        }
      ]
    });

    const { container } = render(AppHeader);
    const tabs = Array.from(container.querySelectorAll<HTMLDivElement>('#mobile-tab-list .mobile-tab-item'));
    const menuButton = tabs[1].querySelector<HTMLButtonElement>('.tab-menu-btn');
    const menu = container.querySelector<HTMLDivElement>('#mobile-tab-menu-tab_mobile_two');

    expect(tabs).toHaveLength(2);
    expect(tabs.map((tab) => tab.querySelector('.mobile-tab-title')?.textContent)).toEqual(['Mobile One', 'Mobile Two']);
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(menuButton?.dataset.tabId).toBe('tab_mobile_two');
    expect(menuButton?.dataset.mobileMenu).toBe('true');
    expect(menu?.dataset.mobileMenu).toBe('true');
    expect(Array.from(menu?.querySelectorAll<HTMLButtonElement>('[data-action]') || []).map((button) => button.dataset.action))
      .toEqual(['rename', 'duplicate', 'delete']);
  });

  it('dispatches mobile tab chrome actions through the command bridge', async () => {
    workspaceState.replace({
      activeTabId: 'tab_mobile_two',
      untitledCounter: 2,
      globalState: {},
      findReplaceDocked: false,
      tabs: [
        {
          id: 'tab_mobile_one',
          title: 'Mobile One',
          content: '# One',
          scrollPos: 0,
          viewMode: 'split',
          createdAt: 1
        },
        {
          id: 'tab_mobile_two',
          title: 'Mobile Two',
          content: '# Two',
          scrollPos: 0,
          viewMode: 'editor',
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

    const { container } = render(AppHeader);
    const firstTabTitle = container.querySelector<HTMLSpanElement>('.mobile-tab-item[data-tab-id="tab_mobile_one"] .mobile-tab-title');
    const secondMenuButton = container.querySelector<HTMLButtonElement>('.mobile-tab-item[data-tab-id="tab_mobile_two"] .tab-menu-btn');
    const deleteAction = container.querySelector<HTMLButtonElement>('#mobile-tab-menu-tab_mobile_two [data-action="delete"]');
    const newTabButton = container.querySelector<HTMLButtonElement>('#mobile-new-tab-btn');
    const resetButton = container.querySelector<HTMLButtonElement>('#mobile-tab-reset-btn');

    expect(firstTabTitle).not.toBeNull();
    expect(secondMenuButton).not.toBeNull();
    expect(deleteAction).not.toBeNull();
    expect(newTabButton).not.toBeNull();
    expect(resetButton).not.toBeNull();

    await fireEvent.click(firstTabTitle as HTMLSpanElement);
    await fireEvent.click(secondMenuButton as HTMLButtonElement);
    expect(secondMenuButton?.classList.contains('open')).toBe(true);
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('#mobile-tab-menu-tab_mobile_two')?.classList.contains('open')).toBe(true);

    await fireEvent.click(deleteAction as HTMLButtonElement);
    expect(secondMenuButton?.classList.contains('open')).toBe(false);
    expect(secondMenuButton?.getAttribute('aria-expanded')).toBe('false');

    await fireEvent.click(newTabButton as HTMLButtonElement);
    await fireEvent.click(resetButton as HTMLButtonElement);

    expect(calls).toEqual([
      'select:tab_mobile_one:true',
      'menu:tab_mobile_two:delete:true',
      'create:true',
      'reset:true'
    ]);
  });
});
