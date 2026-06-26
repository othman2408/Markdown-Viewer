// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { OpenTabMenuState, ToggleTabMenuInput } from '../../../lib/state/tabMenu.svelte';
import {
  createTabActionMenuController,
  getTabActionMenuId,
  getTabActionMenuStyle,
  getTabActionMenuTitle,
  isTabActionMenuOpen
} from '../../../lib/tabs/tabActionMenuController';

describe('tab action menu controller', () => {
  it('derives stable title, id, open state, and positioned style', () => {
    const openState: OpenTabMenuState = {
      menuId: 'desktop-tab-menu-tab_one',
      tabId: 'tab_one',
      mobile: false,
      position: {
        top: 12,
        left: 34
      }
    };

    expect(getTabActionMenuTitle({ title: '' })).toBe('Untitled');
    expect(getTabActionMenuTitle({ title: 'Readme' })).toBe('Readme');
    expect(getTabActionMenuId('desktop-tab-menu', 'tab_one')).toBe('desktop-tab-menu-tab_one');
    expect(isTabActionMenuOpen(openState, 'desktop-tab-menu-tab_one')).toBe(true);
    expect(isTabActionMenuOpen(openState, 'desktop-tab-menu-tab_two')).toBe(false);
    expect(getTabActionMenuStyle(openState, 'desktop-tab-menu-tab_one')).toBe('top: 12px; left: 34px; right: auto;');
    expect(getTabActionMenuStyle(openState, 'desktop-tab-menu-tab_two')).toBeUndefined();
  });

  it('stops toggle events and passes current menu inputs to the toggle state adapter', () => {
    const button = document.createElement('button');
    const dropdown = document.createElement('div');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'currentTarget', { value: button });
    const toggleMenu = vi.fn((_: ToggleTabMenuInput) => {});
    const controller = createTabActionMenuController({
      getDropdownElement: () => dropdown,
      getMenuId: () => 'mobile-tab-menu-tab_one',
      getMobile: () => true,
      getTabId: () => 'tab_one',
      toggleMenu,
      closeMenu: vi.fn(),
      dispatchAction: vi.fn()
    });

    controller.handleMenuToggle(event);

    expect(event.defaultPrevented).toBe(true);
    expect(toggleMenu).toHaveBeenCalledWith({
      button,
      dropdown,
      menuId: 'mobile-tab-menu-tab_one',
      mobile: true,
      tabId: 'tab_one'
    });
  });

  it('stops action events, closes the open menu, and dispatches through the tab action adapter', () => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    const closeMenu = vi.fn();
    const dispatchAction = vi.fn();
    const controller = createTabActionMenuController({
      getDropdownElement: () => null,
      getMenuId: () => 'desktop-tab-menu-tab_one',
      getMobile: () => false,
      getTabId: () => 'tab_one',
      toggleMenu: vi.fn(),
      closeMenu,
      dispatchAction
    });

    controller.handleMenuAction(event, 'duplicate');

    expect(event.defaultPrevented).toBe(true);
    expect(closeMenu).toHaveBeenCalledOnce();
    expect(dispatchAction).toHaveBeenCalledWith('tab_one', 'duplicate', false);
  });
});
