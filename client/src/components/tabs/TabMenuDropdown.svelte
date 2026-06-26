<script lang="ts">
  import type { TabMenuAction } from '../../lib/types/workspace';
  import TabMenuActionList from './TabMenuActionList.svelte';

  type TabMenuDropdownProps = {
    element: HTMLDivElement | null;
    menuId: string;
    isOpen: boolean;
    tabId: string;
    mobile: boolean;
    menuStyle?: string;
    onAction: (event: MouseEvent, action: TabMenuAction) => void;
  };

  let {
    element = $bindable(null),
    menuId,
    isOpen,
    tabId,
    mobile,
    menuStyle,
    onAction
  }: TabMenuDropdownProps = $props();
</script>

<div
  bind:this={element}
  id={menuId}
  class="tab-menu-dropdown"
  class:open={isOpen}
  data-tab-menu-dropdown="true"
  data-tab-id={tabId}
  data-mobile-menu={mobile ? 'true' : undefined}
  role="menu"
  style={menuStyle}
>
  <TabMenuActionList {onAction} />
</div>
