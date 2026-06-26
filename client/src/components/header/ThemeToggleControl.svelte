<script lang="ts">
  import type { ThemeToggleVariant } from '../../lib/header/themeBridge';

  type ThemeToggleControlProps = {
    variant: ThemeToggleVariant;
    isDark: boolean;
    onToggle: () => void;
  };

  let { variant, isDark, onToggle }: ThemeToggleControlProps = $props();

  let icon = $derived(isDark ? 'bi-sun' : 'bi-moon');
</script>

{#if variant === 'mobile'}
  <button id="mobile-theme-toggle" class="mobile-menu-item" title="Toggle Dark Mode" onclick={onToggle}>
    <i class={`bi ${icon} me-2`}></i> Dark Mode
  </button>
{:else}
  <button id="theme-toggle" class="tool-button" title="Toggle Dark Mode" onclick={onToggle}>
    <i class={`bi ${icon}`}></i>
  </button>
{/if}
