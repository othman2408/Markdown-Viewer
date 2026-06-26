<script lang="ts">
  import { mobileMenuActions } from '../../lib/header/mobileMenuActions';
  import CloudLogoutButton from './CloudLogoutButton.svelte';
  import MobileMenuActionButton from './MobileMenuActionButton.svelte';
  import SyncScrollButton from './SyncScrollButton.svelte';
  import ThemeToggleButton from './ThemeToggleButton.svelte';
</script>

<div class="mobile-menu-items">
  <SyncScrollButton variant="mobile" />

  {#each mobileMenuActions as mobileAction (mobileAction.id)}
    <MobileMenuActionButton
      id={mobileAction.id}
      title={mobileAction.title}
      action={mobileAction.action}
      icon={mobileAction.icon}
      label={mobileAction.label}
    />
  {/each}

  <ThemeToggleButton variant="mobile" />
  <CloudLogoutButton variant="mobile" />
</div>
