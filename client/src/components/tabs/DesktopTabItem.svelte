<script lang="ts">
  import type { DocumentTab } from '../../lib/types/workspace';
  import TabActionMenu from './TabActionMenu.svelte';

  type DesktopTabItemProps = {
    tab: DocumentTab;
    activeTabId: string | null;
  };

  let { tab, activeTabId }: DesktopTabItemProps = $props();

  let title = $derived(tab.title || 'Untitled');
  let isActive = $derived(tab.id === activeTabId);
</script>

<div
  class="tab-item"
  class:active={isActive}
  data-tab-id={tab.id}
  role="tab"
  aria-selected={isActive}
  draggable="true"
  tabindex={isActive ? 0 : -1}
>
  <span class="tab-title" title={title}>{title}</span>
  <TabActionMenu tab={tab} menuIdPrefix="desktop-tab-menu" />
</div>
