<script lang="ts">
  import CloudLogoutButton from './CloudLogoutButton.svelte';
  import DesktopExportDropdown from './DesktopExportDropdown.svelte';
  import DesktopFileInput from './DesktopFileInput.svelte';
  import DesktopHeaderActions from './DesktopHeaderActions.svelte';
  import DesktopImportDropdown from './DesktopImportDropdown.svelte';
  import SyncScrollButton from './SyncScrollButton.svelte';
  import ThemeToggleButton from './ThemeToggleButton.svelte';
  import ViewModeControls from './ViewModeControls.svelte';
</script>

<div class="toolbar d-none d-md-flex header-right">
  <ViewModeControls />
  <span class="toolbar-divider" aria-hidden="true"></span>
  <SyncScrollButton />
  <DesktopImportDropdown />
  <DesktopFileInput />
  <DesktopExportDropdown />
  <DesktopHeaderActions />
  <ThemeToggleButton />
  <CloudLogoutButton />
</div>
