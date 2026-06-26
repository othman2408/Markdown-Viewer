<script lang="ts">
  import type { ShareMode } from '../../lib/state/modals.svelte';
  import ShareModalBody from './ShareModalBody.svelte';
  import ShareModalFooter from './ShareModalFooter.svelte';
  import ShareModalHeader from './ShareModalHeader.svelte';

  type ShareModalBoxProps = {
    shareMode: ShareMode;
    shareUrl: string;
    copyDisabled: boolean;
    copySucceeded: boolean;
    onClose: () => void;
    onSelectMode: (mode: ShareMode) => void;
    onCopyUrl: () => void | Promise<void>;
  };

  let {
    shareMode,
    shareUrl,
    copyDisabled,
    copySucceeded,
    onClose,
    onSelectMode,
    onCopyUrl
  }: ShareModalBoxProps = $props();
</script>

<div class="reset-modal-box reset-modal-box--wide modal-box">
  <ShareModalHeader onClose={onClose} />
  <ShareModalBody
    shareMode={shareMode}
    shareUrl={shareUrl}
    copyDisabled={copyDisabled}
    copySucceeded={copySucceeded}
    onSelectMode={onSelectMode}
    onCopyUrl={onCopyUrl}
  />
  <ShareModalFooter onClose={onClose} />
</div>
