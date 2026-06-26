<script lang="ts">
  import { uiState } from '../../lib/state/ui.svelte';
  import MobileMenuOverlay from './MobileMenuOverlay.svelte';
  import MobileMenuPanel from './MobileMenuPanel.svelte';
  import MobileMenuToggle from './MobileMenuToggle.svelte';

  function openMobileMenu() {
    uiState.setMobileMenuOpen(true);
  }

  function closeMobileMenu() {
    uiState.setMobileMenuOpen(false);
  }

  function handleMobileOverlayKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      closeMobileMenu();
    }
  }
</script>

<div class="mobile-menu d-md-none">
  <MobileMenuToggle expanded={uiState.mobileMenuOpen} onOpen={openMobileMenu} />
  <MobileMenuPanel active={uiState.mobileMenuOpen} onClose={closeMobileMenu} />
  <MobileMenuOverlay active={uiState.mobileMenuOpen} onClose={closeMobileMenu} onKeydown={handleMobileOverlayKeydown} />
</div>
