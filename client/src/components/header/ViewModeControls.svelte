<script lang="ts">
  import type { ViewModeControlVariant } from '../../lib/header/viewModeBridge';
  import { viewModeOptions } from '../../lib/header/viewModeOptions';
  import ViewModeButton from './ViewModeButton.svelte';

  type ViewModeControlsProps = {
    variant?: ViewModeControlVariant;
  };

  let { variant = 'desktop' }: ViewModeControlsProps = $props();
</script>

{#if variant === 'mobile'}
  <div class="mobile-view-mode-group mb-3" role="group" aria-label="View mode">
    {#each viewModeOptions as option (option.mode)}
      <ViewModeButton {option} {variant} />
    {/each}
  </div>
{:else}
  <div class="toolbar-group view-toolbar" role="group" aria-label="View mode">
    {#each viewModeOptions as option (option.mode)}
      <ViewModeButton {option} {variant} />
    {/each}
  </div>
{/if}
