<script lang="ts">
  import { dispatchViewModeSelect } from '../../lib/header/viewModeBridge';
  import type { ViewModeControlVariant } from '../../lib/header/viewModeBridge';
  import type { ViewModeOption } from '../../lib/header/viewModeOptions';
  import { uiState } from '../../lib/state/ui.svelte';

  type ViewModeButtonProps = {
    option: ViewModeOption;
    variant: ViewModeControlVariant;
  };

  let { option, variant }: ViewModeButtonProps = $props();

  let active = $derived(uiState.viewMode === option.mode);
</script>

{#if variant === 'mobile'}
  <button
    class="mobile-view-mode-btn"
    class:active
    data-mode={option.mode}
    aria-pressed={active}
    title={option.title}
    onclick={() => dispatchViewModeSelect(option.mode, 'mobile')}
  >
    <i class={`bi ${option.icon}`}></i>
    <span>{option.label}</span>
  </button>
{:else}
  <button
    class="tool-button view-toggle-btn"
    class:is-active={active}
    data-view-mode={option.mode}
    aria-pressed={active}
    title={option.title}
    aria-label={option.title}
    onclick={() => dispatchViewModeSelect(option.mode, 'desktop')}
  >
    <i class={`bi ${option.icon}`}></i>
  </button>
{/if}
