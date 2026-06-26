<script lang="ts">
  import { closeOpenTabMenu } from '../../lib/state/tabMenu.svelte';

  function handleDocumentClick() {
    closeOpenTabMenu();
  }

  function handleDocumentKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeOpenTabMenu();
    }
  }
</script>

<svelte:document onclick={handleDocumentClick} onkeydown={handleDocumentKeydown} />
