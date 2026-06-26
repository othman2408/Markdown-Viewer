import type { OpenTabMenuState, ToggleTabMenuInput } from '../state/tabMenu.svelte';
import type { DocumentTab, TabMenuAction } from '../types/workspace';

export type TabActionMenuController = {
  handleMenuToggle(event: MouseEvent): void;
  handleMenuAction(event: MouseEvent, action: TabMenuAction): void;
};

export type TabActionMenuControllerOptions = {
  getDropdownElement: () => HTMLElement | null;
  getMenuId: () => string;
  getMobile: () => boolean;
  getTabId: () => string;
  toggleMenu: (input: ToggleTabMenuInput) => void;
  closeMenu: () => void;
  dispatchAction: (tabId: string, action: TabMenuAction, mobile: boolean) => void;
};

function stopTabMenuEvent(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

export function getTabActionMenuTitle(tab: Pick<DocumentTab, 'title'>): string {
  return tab.title || 'Untitled';
}

export function getTabActionMenuId(menuIdPrefix: string, tabId: string): string {
  return `${menuIdPrefix}-${tabId}`;
}

export function isTabActionMenuOpen(tabMenuState: OpenTabMenuState | null, menuId: string): boolean {
  return tabMenuState?.menuId === menuId;
}

export function getTabActionMenuStyle(tabMenuState: OpenTabMenuState | null, menuId: string): string | undefined {
  if (!tabMenuState || !isTabActionMenuOpen(tabMenuState, menuId)) return undefined;

  return `top: ${tabMenuState.position.top}px; left: ${tabMenuState.position.left}px; right: auto;`;
}

export function createTabActionMenuController(
  options: TabActionMenuControllerOptions
): TabActionMenuController {
  return {
    handleMenuToggle(event) {
      stopTabMenuEvent(event);
      options.toggleMenu({
        button: event.currentTarget as HTMLElement,
        dropdown: options.getDropdownElement(),
        menuId: options.getMenuId(),
        mobile: options.getMobile(),
        tabId: options.getTabId()
      });
    },
    handleMenuAction(event, action) {
      stopTabMenuEvent(event);
      options.closeMenu();
      options.dispatchAction(options.getTabId(), action, options.getMobile());
    }
  };
}
