<script lang="ts">
  import { workspaceState } from '../../lib/state/workspace.svelte';
  import { createDesktopTabListDispatch, scheduleActiveTabScroll } from '../../lib/tabs/desktopTabListBehavior';
  import { dispatchTabReorder, dispatchTabSelect } from '../../lib/tabs/tabChromeBridge';
  import DesktopTabItem from './DesktopTabItem.svelte';

  let tabs = $derived(workspaceState.tabs);
  let activeTabId = $derived(workspaceState.activeTabId);
  let tabListElement: HTMLDivElement | null = $state(null);

  const desktopTabListDispatch = createDesktopTabListDispatch({
    dispatchTabReorder,
    dispatchTabSelect
  });

  $effect(() => {
    const tabId = activeTabId;
    const renderedTabs = tabs.length;
    if (!tabListElement || !tabId || renderedTabs === 0) return;

    return scheduleActiveTabScroll(tabListElement);
  });
</script>

<div bind:this={tabListElement} class="tab-list" id="tab-list" role="tablist" aria-label="Document tabs" {@attach desktopTabListDispatch}>
  {#each tabs as tab (tab.id)}
    <DesktopTabItem {tab} {activeTabId} />
  {/each}
</div>
