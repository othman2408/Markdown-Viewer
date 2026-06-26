<script lang="ts">
  import { uiState } from '../../lib/state/ui.svelte';
  import { dispatchThemeToggle } from '../../lib/header/themeBridge';
  import type { ThemeToggleVariant } from '../../lib/header/themeBridge';
  import ThemeToggleControl from './ThemeToggleControl.svelte';

  type ThemeToggleButtonProps = {
    variant?: ThemeToggleVariant;
  };

  let { variant = 'desktop' }: ThemeToggleButtonProps = $props();

  let isDark = $derived(uiState.theme === 'dark');
</script>

<ThemeToggleControl {variant} {isDark} onToggle={() => dispatchThemeToggle(variant)} />
