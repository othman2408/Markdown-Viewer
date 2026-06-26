<script lang="ts">
  import type { ShareMode } from '../../lib/state/modals.svelte';
  import ShareModeCard from './ShareModeCard.svelte';

  type ShareModeSelectorProps = {
    shareMode: ShareMode;
    onSelectMode: (mode: ShareMode) => void;
  };

  let { shareMode, onSelectMode }: ShareModeSelectorProps = $props();
</script>

<div class="share-mode-cards">
  <ShareModeCard
    mode="view"
    selected={shareMode === 'view'}
    iconClass="bi-eye"
    title="View only"
    description="Opens in preview mode. The editor is hidden."
    onselect={onSelectMode}
  />
  <ShareModeCard
    mode="edit"
    selected={shareMode === 'edit'}
    iconClass="bi-pencil-square"
    title="Edit"
    description="Opens in split editor + preview mode."
    onselect={onSelectMode}
  />
</div>
