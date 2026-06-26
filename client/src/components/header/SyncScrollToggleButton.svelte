<script lang="ts">
  import type { SyncScrollControlVariant } from '../../lib/header/syncScrollBridge';

  type SyncScrollToggleButtonProps = {
    variant: SyncScrollControlVariant;
    icon: string;
    label: string;
    stateClass: string;
    isSplitView: boolean;
    onToggle: () => void;
  };

  let {
    variant,
    icon,
    label,
    stateClass,
    isSplitView,
    onToggle
  }: SyncScrollToggleButtonProps = $props();
</script>

{#if variant === 'mobile'}
  <button
    id="mobile-toggle-sync"
    class={`mobile-menu-item tool-button ${stateClass}`}
    title="Toggle Sync Scrolling"
    disabled={!isSplitView}
    aria-disabled={!isSplitView}
    onclick={onToggle}
  >
    <i class={`bi ${icon}`}></i> {label}
  </button>
{:else}
  <button
    id="toggle-sync"
    class={`tool-button ${stateClass}`}
    title="Toggle Sync Scrolling"
    disabled={!isSplitView}
    aria-disabled={!isSplitView}
    onclick={onToggle}
  >
    <i class={`bi ${icon}`}></i> <span class="btn-text">{label}</span>
  </button>
{/if}
