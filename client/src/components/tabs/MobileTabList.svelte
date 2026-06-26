<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import { workspaceState } from '../../lib/state/workspace.svelte';
  import { dispatchTabSelect } from '../../lib/tabs/tabChromeBridge';
  import MobileTabItem from './MobileTabItem.svelte';

  let tabs = $derived(workspaceState.tabs);
  let activeTabId = $derived(workspaceState.activeTabId);

  function getEventElement(event: Event): Element | null {
    return event.target instanceof Element ? event.target : null;
  }

  const mobileTabListDispatch: Attachment<HTMLDivElement> = (node) => {
    function handleClick(event: MouseEvent) {
      const target = getEventElement(event);
      if (!target || target.closest('.tab-menu-btn, .tab-menu-item')) return;

      const tabItem = target.closest<HTMLElement>('.mobile-tab-item');
      const tabId = tabItem?.dataset.tabId;
      if (!tabId) return;

      dispatchTabSelect(tabId, true);
    }

    node.addEventListener('click', handleClick);
    return () => node.removeEventListener('click', handleClick);
  };
</script>

<div id="mobile-tab-list" class="mobile-tab-list" role="tablist" aria-label="Document tabs" {@attach mobileTabListDispatch}>
  {#each tabs as tab (tab.id)}
    <MobileTabItem {tab} {activeTabId} />
  {/each}
</div>
