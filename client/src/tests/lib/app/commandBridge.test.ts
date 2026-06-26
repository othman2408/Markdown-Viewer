// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  applyPaneWidthsFromBridge,
  registerHeaderActionBridge,
  registerEditorGeometryBridge,
  registerAuthBridge,
  registerMarkdownToolbarBridge,
  registerShareBridge,
  registerSyncScrollBridge,
  registerThemeBridge,
  registerViewModeBridge,
  registerWorkspaceTabBridge,
  resetPaneWidthsFromBridge
} from '../../../lib/app/commandBridge';

describe('app command bridge', () => {
  it('registers the auth bridge and closes the mobile menu before logout', () => {
    const closeMobileMenu = vi.fn();
    const logout = vi.fn();
    const event = new Event('click');

    registerAuthBridge({ closeMobileMenu, logout });
    window.markdownViewerAuth?.logout('mobile', event);

    expect(closeMobileMenu).toHaveBeenCalledOnce();
    expect(logout).toHaveBeenCalledWith(event);
  });

  it('registers header actions through the shared header action controller', () => {
    const handlers = {
      copyMarkdown: vi.fn(),
      exportHtml: vi.fn(),
      exportMarkdown: vi.fn(),
      exportPdf: vi.fn(),
      exportPng: vi.fn(),
      importFile: vi.fn(),
      importGithub: vi.fn(),
      share: vi.fn()
    };
    const event = new Event('click');

    const controller = registerHeaderActionBridge(handlers);
    window.markdownViewerHeaderActions?.run('importGithub', 'mobile', event);

    expect(window.markdownViewerHeaderActions).toBe(controller);
    expect(handlers.importGithub).toHaveBeenCalledWith(event, 'mobile');
  });

  it('registers workspace tab commands through the shared tab controller', () => {
    const handlers = {
      closeMobileMenu: vi.fn(),
      closeTabMenus: vi.fn(),
      createTab: vi.fn(),
      deleteTab: vi.fn(),
      duplicateTab: vi.fn(),
      renameTab: vi.fn(),
      reorderTabs: vi.fn(),
      resetTabs: vi.fn(),
      selectTab: vi.fn()
    };

    const controller = registerWorkspaceTabBridge(handlers);
    window.markdownViewerTabs?.runMenuAction?.('tab-1', 'rename', true);

    expect(window.markdownViewerTabs).toBe(controller);
    expect(handlers.closeTabMenus).toHaveBeenCalledOnce();
    expect(handlers.closeMobileMenu).toHaveBeenCalledOnce();
    expect(handlers.renameTab).toHaveBeenCalledWith('tab-1');
  });

  it('registers markdown toolbar commands', () => {
    const handlers = {
      runMarkdownTool: vi.fn(),
      toggleContentDirection: vi.fn()
    };
    const button = document.createElement('button');

    registerMarkdownToolbarBridge(handlers);
    window.markdownViewerToolbar?.runMarkdownTool?.('bold', button);
    window.markdownViewerToolbar?.toggleContentDirection?.();

    expect(handlers.runMarkdownTool).toHaveBeenCalledWith('bold', button);
    expect(handlers.toggleContentDirection).toHaveBeenCalledOnce();
  });

  it('registers sync scroll, theme, view mode, and editor geometry bridges', () => {
    const toggleSyncScrolling = vi.fn();
    const toggleTheme = vi.fn();
    const refreshAfterPaneLayout = vi.fn();
    const viewModeHandlers = {
      closeMobileMenu: vi.fn(),
      resolveDesktopMode: vi.fn(() => 'split' as const),
      saveCurrentTabState: vi.fn(),
      setViewMode: vi.fn()
    };

    registerSyncScrollBridge({ toggleSyncScrolling });
    registerThemeBridge({ toggleTheme });
    registerViewModeBridge(viewModeHandlers);
    registerEditorGeometryBridge({ refreshAfterPaneLayout });

    window.markdownViewerSyncScroll?.toggle('mobile');
    window.markdownViewerTheme?.toggle('mobile');
    window.markdownViewerViewMode?.select('preview', 'desktop');
    window.markdownViewerViewMode?.select('editor', 'mobile');
    window.markdownViewerEditorGeometry?.refreshAfterPaneLayout();

    expect(toggleSyncScrolling).toHaveBeenCalledOnce();
    expect(toggleTheme).toHaveBeenCalledOnce();
    expect(viewModeHandlers.resolveDesktopMode).toHaveBeenCalledWith('preview');
    expect(viewModeHandlers.setViewMode).toHaveBeenNthCalledWith(1, 'split');
    expect(viewModeHandlers.setViewMode).toHaveBeenNthCalledWith(2, 'editor');
    expect(viewModeHandlers.saveCurrentTabState).toHaveBeenCalledTimes(2);
    expect(viewModeHandlers.closeMobileMenu).toHaveBeenCalledOnce();
    expect(refreshAfterPaneLayout).toHaveBeenCalledOnce();
  });

  it('registers share modal mode selection', () => {
    const selectShareMode = vi.fn();

    registerShareBridge({ selectShareMode });
    window.markdownViewerShare?.selectMode?.('view');

    expect(selectShareMode).toHaveBeenCalledWith('view');
  });

  it('uses pane resizer bridge when present and falls back to editor geometry refresh', () => {
    const refreshEditorWidth = vi.fn();
    const scheduleLineNumberUpdate = vi.fn();
    const apply = vi.fn();
    const reset = vi.fn();

    window.markdownViewerPaneResizer = {
      apply,
      refreshLayout: vi.fn(),
      reset
    };

    applyPaneWidthsFromBridge({ refreshEditorWidth, scheduleLineNumberUpdate });
    resetPaneWidthsFromBridge({ refreshEditorWidth });

    expect(apply).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
    expect(refreshEditorWidth).not.toHaveBeenCalled();

    delete window.markdownViewerPaneResizer;

    applyPaneWidthsFromBridge({ refreshEditorWidth, scheduleLineNumberUpdate });
    resetPaneWidthsFromBridge({ refreshEditorWidth });

    expect(refreshEditorWidth).toHaveBeenCalledTimes(2);
    expect(scheduleLineNumberUpdate).toHaveBeenCalledOnce();
  });
});
