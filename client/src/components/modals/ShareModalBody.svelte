<script lang="ts">
  import type { ShareMode } from '../../lib/state/modals.svelte';
  import ShareModalNotice from './ShareModalNotice.svelte';
  import ShareModeSelector from './ShareModeSelector.svelte';
  import ShareUrlRow from './ShareUrlRow.svelte';

  type ShareModalBodyProps = {
    shareMode: ShareMode;
    shareUrl: string;
    copyDisabled: boolean;
    copySucceeded: boolean;
    onSelectMode: (mode: ShareMode) => void;
    onCopyUrl: () => void | Promise<void>;
  };

  let {
    shareMode,
    shareUrl,
    copyDisabled,
    copySucceeded,
    onSelectMode,
    onCopyUrl
  }: ShareModalBodyProps = $props();
</script>

<div class="modal-body">
  <p class="share-modal-description">Choose how recipients can interact with this document.</p>
  <ShareModeSelector {shareMode} {onSelectMode} />
  <ShareUrlRow
    shareUrl={shareUrl}
    copyDisabled={copyDisabled}
    copySucceeded={copySucceeded}
    oncopy={onCopyUrl}
  />
  <ShareModalNotice />
</div>
