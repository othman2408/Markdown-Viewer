<script lang="ts">
  import { onDestroy } from 'svelte';
  import { modalState } from '../../lib/state/modals.svelte';
  import { createShareModalController } from '../../lib/modals/shareController';
  import ShareModalDialog from './ShareModalDialog.svelte';

  const shareModalController = createShareModalController();

  onDestroy(() => {
    shareModalController.destroy();
  });
</script>

<svelte:window onkeydown={shareModalController.handleWindowKeydown} />

<ShareModalDialog
  open={modalState.shareOpen}
  shareMode={modalState.shareMode}
  shareUrl={modalState.shareUrl}
  copyDisabled={modalState.shareCopyDisabled}
  copySucceeded={modalState.shareCopySucceeded}
  onOverlayClick={shareModalController.handleOverlayClick}
  onClose={shareModalController.closeShareModal}
  onSelectMode={shareModalController.selectShareMode}
  onCopyUrl={shareModalController.copyShareUrl}
/>
