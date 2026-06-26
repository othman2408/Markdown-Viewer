<script lang="ts">
  import type { ShareMode } from '../../lib/state/modals.svelte';
  import ShareModalBox from './ShareModalBox.svelte';

  type ShareModalDialogProps = {
    open: boolean;
    shareMode: ShareMode;
    shareUrl: string;
    copyDisabled: boolean;
    copySucceeded: boolean;
    onOverlayClick: (event: MouseEvent) => void;
    onClose: () => void;
    onSelectMode: (mode: ShareMode) => void;
    onCopyUrl: () => void | Promise<void>;
  };

  let {
    open,
    shareMode,
    shareUrl,
    copyDisabled,
    copySucceeded,
    onOverlayClick,
    onClose,
    onSelectMode,
    onCopyUrl
  }: ShareModalDialogProps = $props();
</script>

<div
  id="share-modal"
  class="reset-modal-overlay modal-overlay"
  class:is-visible={open}
  role="dialog"
  aria-modal="true"
  aria-labelledby="share-modal-title"
  aria-hidden={open ? 'false' : 'true'}
  onclick={onOverlayClick}
>
  <ShareModalBox
    {shareMode}
    {shareUrl}
    {copyDisabled}
    {copySucceeded}
    {onClose}
    {onSelectMode}
    {onCopyUrl}
  />
</div>
