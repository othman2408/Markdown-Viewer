<script lang="ts">
  import { editorState } from '../../lib/state/editor.svelte';
  import { dispatchSyncScrollToggle } from '../../lib/header/syncScrollBridge';
  import type { SyncScrollControlVariant } from '../../lib/header/syncScrollBridge';
  import { uiState } from '../../lib/state/ui.svelte';
  import SyncScrollToggleButton from './SyncScrollToggleButton.svelte';

  type SyncScrollButtonProps = {
    variant?: SyncScrollControlVariant;
  };

  let { variant = 'desktop' }: SyncScrollButtonProps = $props();

  let enabled = $derived(editorState.syncScrollingEnabled);
  let isSplitView = $derived(uiState.viewMode === 'split');
  let icon = $derived(enabled ? 'bi-link-45deg' : 'bi-link');
  let label = $derived(enabled ? 'Sync Off' : 'Sync On');
  let stateClass = $derived(enabled ? 'sync-disabled sync-active' : 'sync-enabled');
</script>

<SyncScrollToggleButton
  {variant}
  {icon}
  {label}
  {stateClass}
  {isSplitView}
  onToggle={() => dispatchSyncScrollToggle(variant)}
/>
