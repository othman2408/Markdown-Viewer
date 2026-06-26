<script lang="ts">
  import { dispatchCreateTab, dispatchResetTabs } from '../../lib/tabs/tabChromeBridge';
  import MobileTabList from '../tabs/MobileTabList.svelte';
</script>

<div class="mobile-tabs-section mb-3">
  <div class="mobile-tabs-header">
    <span class="mobile-tabs-label"><i class="bi bi-files me-1"></i> Documents</span>
    <button
      type="button"
      id="mobile-new-tab-btn"
      class="mobile-new-tab-btn"
      title="New document"
      aria-label="New document"
      onclick={() => dispatchCreateTab(true)}
    >
      <i class="bi bi-plus-lg"></i>
    </button>
  </div>
  <MobileTabList />
  <button
    type="button"
    id="mobile-tab-reset-btn"
    class="tab-reset-btn mt-2 w-100"
    title="Reset all files"
    aria-label="Reset all files"
    onclick={() => dispatchResetTabs(true)}
  >
    <i class="bi bi-arrow-counterclockwise"></i> Reset all files
  </button>
</div>
