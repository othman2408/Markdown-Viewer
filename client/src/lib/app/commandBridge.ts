import {
  createHeaderActionController,
  type HeaderActionHandlers
} from '../header/headerActionController';
import type { HeaderActionsBridge } from '../header/headerActionBridge';
import type { LogoutControlVariant } from '../header/authBridge';
import type { SyncScrollControlVariant } from '../header/syncScrollBridge';
import type { ThemeToggleVariant } from '../header/themeBridge';
import type { ViewModeControlVariant } from '../header/viewModeBridge';
import type { MarkdownFormatAction } from '../types/editor';
import type { ViewMode } from '../types/workspace';
import type { EditorGeometryBridge } from '../editor/paneResizeBridge';
import type { ShareMode } from '../state/modals.svelte';
import {
  createWorkspaceTabCommandController,
  type WorkspaceTabCommandController,
  type WorkspaceTabCommandHandlers
} from '../workspace/controller';

export type AuthBridgeHandlers = {
  closeMobileMenu(): void;
  logout(event?: Event): void | Promise<void>;
};

export type MarkdownToolbarBridgeHandlers = {
  runMarkdownTool(action: MarkdownFormatAction, button: HTMLElement): void;
  toggleContentDirection(): void;
};

export type SyncScrollBridgeHandlers = {
  toggleSyncScrolling(): void;
};

export type ThemeBridgeHandlers = {
  toggleTheme(): void;
};

export type ShareBridgeHandlers = {
  selectShareMode(mode: ShareMode): void;
};

export type PaneWidthFallbackHandlers = {
  refreshEditorWidth(): void;
  scheduleLineNumberUpdate(): void;
};

export type ViewModeBridgeHandlers = {
  closeMobileMenu(): void;
  resolveDesktopMode(mode: ViewMode): ViewMode;
  saveCurrentTabState(): void;
  setViewMode(mode: ViewMode): void;
};

export function registerAuthBridge(
  handlers: AuthBridgeHandlers,
  windowRef: Window = window
): void {
  windowRef.markdownViewerAuth = {
    logout(variant: LogoutControlVariant = 'desktop', event?: Event) {
      if (variant === 'mobile') handlers.closeMobileMenu();
      void handlers.logout(event);
    }
  };
}

export function registerHeaderActionBridge(
  handlers: HeaderActionHandlers,
  windowRef: Window = window
): HeaderActionsBridge {
  const controller = createHeaderActionController(handlers);
  windowRef.markdownViewerHeaderActions = controller;
  return controller;
}

export function registerWorkspaceTabBridge(
  handlers: WorkspaceTabCommandHandlers,
  windowRef: Window = window
): WorkspaceTabCommandController {
  const controller = createWorkspaceTabCommandController(handlers);
  windowRef.markdownViewerTabs = controller;
  return controller;
}

export function registerMarkdownToolbarBridge(
  handlers: MarkdownToolbarBridgeHandlers,
  windowRef: Window = window
): void {
  windowRef.markdownViewerToolbar = {
    runMarkdownTool: handlers.runMarkdownTool,
    toggleContentDirection: handlers.toggleContentDirection
  };
}

export function registerSyncScrollBridge(
  handlers: SyncScrollBridgeHandlers,
  windowRef: Window = window
): void {
  windowRef.markdownViewerSyncScroll = {
    toggle(_variant: SyncScrollControlVariant = 'desktop') {
      handlers.toggleSyncScrolling();
    }
  };
}

export function registerViewModeBridge(
  handlers: ViewModeBridgeHandlers,
  windowRef: Window = window
): void {
  windowRef.markdownViewerViewMode = {
    select(mode: ViewMode, variant: ViewModeControlVariant = 'desktop') {
      const nextMode = variant === 'desktop' ? handlers.resolveDesktopMode(mode) : mode;
      handlers.setViewMode(nextMode);
      handlers.saveCurrentTabState();
      if (variant === 'mobile') handlers.closeMobileMenu();
    }
  };
}

export function registerThemeBridge(
  handlers: ThemeBridgeHandlers,
  windowRef: Window = window
): void {
  windowRef.markdownViewerTheme = {
    toggle(_variant: ThemeToggleVariant = 'desktop') {
      handlers.toggleTheme();
    }
  };
}

export function registerEditorGeometryBridge(
  bridge: EditorGeometryBridge,
  windowRef: Window = window
): void {
  windowRef.markdownViewerEditorGeometry = bridge;
}

export function registerShareBridge(
  handlers: ShareBridgeHandlers,
  windowRef: Window = window
): void {
  windowRef.markdownViewerShare = {
    selectMode: handlers.selectShareMode
  };
}

export function applyPaneWidthsFromBridge(
  handlers: PaneWidthFallbackHandlers,
  windowRef: Window = window
): void {
  if (typeof windowRef.markdownViewerPaneResizer?.apply === 'function') {
    windowRef.markdownViewerPaneResizer.apply();
    return;
  }

  handlers.refreshEditorWidth();
  handlers.scheduleLineNumberUpdate();
}

export function resetPaneWidthsFromBridge(
  handlers: Pick<PaneWidthFallbackHandlers, 'refreshEditorWidth'>,
  windowRef: Window = window
): void {
  if (typeof windowRef.markdownViewerPaneResizer?.reset === 'function') {
    windowRef.markdownViewerPaneResizer.reset();
    return;
  }

  handlers.refreshEditorWidth();
}
