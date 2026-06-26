<script lang="ts">
  import HeaderStats from './HeaderStats.svelte';
  import MobileMenuActions from './MobileMenuActions.svelte';
  import MobileMenuTabsSection from './MobileMenuTabsSection.svelte';
  import ViewModeControls from './ViewModeControls.svelte';

  type MobileMenuPanelProps = {
    active: boolean;
    onClose: () => void;
  };

  let { active, onClose }: MobileMenuPanelProps = $props();
</script>

<div id="mobile-menu-panel" class="mobile-menu-panel" class:active>
  <div class="mobile-menu-header">
    <h2 class="h5 m-0">Menu</h2>
    <button id="close-mobile-menu" class="tool-button" aria-label="Close menu" onclick={onClose}>
      <i class="bi bi-x-lg"></i>
    </button>
  </div>

  <MobileMenuTabsSection />
  <ViewModeControls variant="mobile" />
  <HeaderStats mobile />
  <MobileMenuActions />
</div>
