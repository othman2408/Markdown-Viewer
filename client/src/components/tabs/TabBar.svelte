<script lang="ts">
  import { dispatchCreateTab, dispatchResetTabs } from '../../lib/tabs/tabChromeBridge';
  import { createTabBarOverflowControls } from '../../lib/tabs/tabBarOverflowBehavior';
  import DesktopTabList from './DesktopTabList.svelte';

  const tabBarOverflowControls = createTabBarOverflowControls();
</script>

<!-- Tab Bar -->
<div class="tab-bar" id="tab-bar" {@attach tabBarOverflowControls}>
  <button type="button" class="tab-scroll-btn tab-scroll-left" aria-label="Scroll tabs left" title="Scroll left">
    <i class="bi bi-chevron-left"></i>
  </button>
  <DesktopTabList />
  <button type="button" class="tab-scroll-btn tab-scroll-right" aria-label="Scroll tabs right" title="Scroll right">
    <i class="bi bi-chevron-right"></i>
  </button>
  <button type="button" class="tab-new-btn" id="tab-new-btn" title="New Tab (Ctrl+T)" aria-label="Open new tab" onclick={() => dispatchCreateTab(false)}>
    <i class="bi bi-plus-lg"></i> New Tab
  </button>
  <button type="button" class="tab-reset-btn" id="tab-reset-btn" title="Reset all files" aria-label="Reset all files" onclick={() => dispatchResetTabs(false)}>
    <i class="bi bi-arrow-counterclockwise"></i> Reset
  </button>
</div>
