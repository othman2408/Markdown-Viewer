<script lang="ts">
  import type { DocumentTab } from '../../lib/types/workspace';
  import TabActionMenu from './TabActionMenu.svelte';

  type MobileTabItemProps = {
    tab: DocumentTab;
    activeTabId: string | null;
  };

  let { tab, activeTabId }: MobileTabItemProps = $props();
  let title = $derived(tab.title || 'Untitled');
  let isActive = $derived(tab.id === activeTabId);
</script>

<div
  class="mobile-tab-item"
  class:active={isActive}
  role="tab"
  aria-selected={isActive}
  data-tab-id={tab.id}
>
  <span class="mobile-tab-title" title={title}>{title}</span>
  <TabActionMenu tab={tab} menuIdPrefix="mobile-tab-menu" mobile />
</div>
