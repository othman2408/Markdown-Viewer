<script lang="ts">
  import DesktopToolbar from './header/DesktopToolbar.svelte';
  import HeaderStats from './header/HeaderStats.svelte';
  import MobileMenu from './header/MobileMenu.svelte';
</script>

<!-- Svelte-owned header markup. Keep IDs/classes aligned with the current DOM contract. -->
<header class="app-header">
  <div class="container-fluid d-flex justify-content-between align-items-center header-container">
    <div class="d-flex align-items-center header-left">
      <h1 class="h4 mb-0 me-2">Markdown Viewer</h1>
      <HeaderStats />
    </div>

    <DesktopToolbar />
    <MobileMenu />
  </div>
</header>
