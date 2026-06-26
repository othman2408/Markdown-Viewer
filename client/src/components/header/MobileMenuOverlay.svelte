<script lang="ts">
  type MobileMenuOverlayProps = {
    active: boolean;
    onClose: () => void;
    onKeydown: (event: KeyboardEvent) => void;
  };

  let { active, onClose, onKeydown }: MobileMenuOverlayProps = $props();
</script>

<div
  id="mobile-menu-overlay"
  role="button"
  tabindex="0"
  aria-label="Close menu"
  class:active
  onclick={onClose}
  onkeydown={onKeydown}
></div>
