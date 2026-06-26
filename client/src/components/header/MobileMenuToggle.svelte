<script lang="ts">
  type MobileMenuToggleProps = {
    expanded: boolean;
    onOpen: () => void;
  };

  let { expanded, onOpen }: MobileMenuToggleProps = $props();
</script>

<button id="mobile-menu-toggle" class="tool-button" title="Menu" aria-expanded={expanded} onclick={onOpen}>
  <i class="bi bi-list"></i>
</button>
