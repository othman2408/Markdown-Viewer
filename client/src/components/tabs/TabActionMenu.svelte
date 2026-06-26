<script lang="ts">
  import { closeOpenTabMenu, tabMenuState, toggleOpenTabMenu } from '../../lib/state/tabMenu.svelte';
  import { dispatchTabMenuAction } from '../../lib/tabs/tabChromeBridge';
  import {
    createTabActionMenuController,
    getTabActionMenuId,
    getTabActionMenuStyle,
    getTabActionMenuTitle,
    isTabActionMenuOpen
  } from '../../lib/tabs/tabActionMenuController';
  import type { DocumentTab } from '../../lib/types/workspace';
  import TabMenuDropdown from './TabMenuDropdown.svelte';
  import TabMenuToggleButton from './TabMenuToggleButton.svelte';

  type TabActionMenuProps = {
    tab: DocumentTab;
    menuIdPrefix: string;
    mobile?: boolean;
  };

  let { tab, menuIdPrefix, mobile = false }: TabActionMenuProps = $props();

  let dropdownElement: HTMLDivElement | null = $state(null);
  let title = $derived(getTabActionMenuTitle(tab));
  let menuId = $derived(getTabActionMenuId(menuIdPrefix, tab.id));
  let isOpen = $derived(isTabActionMenuOpen(tabMenuState.snapshot, menuId));
  let menuStyle = $derived(getTabActionMenuStyle(tabMenuState.snapshot, menuId));
  const controller = createTabActionMenuController({
    getDropdownElement: () => dropdownElement,
    getMenuId: () => menuId,
    getMobile: () => mobile,
    getTabId: () => tab.id,
    toggleMenu: toggleOpenTabMenu,
    closeMenu: closeOpenTabMenu,
    dispatchAction: dispatchTabMenuAction
  });
</script>

<TabMenuToggleButton
  {title}
  {menuId}
  {isOpen}
  tabId={tab.id}
  {mobile}
  onToggle={controller.handleMenuToggle}
/>
<TabMenuDropdown
  bind:element={dropdownElement}
  {menuId}
  {isOpen}
  tabId={tab.id}
  {mobile}
  {menuStyle}
  onAction={controller.handleMenuAction}
/>
