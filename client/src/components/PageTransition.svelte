<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade, type FadeParams } from 'svelte/transition';

  type Props = {
    pageKey: string;
    app?: boolean;
    children: Snippet;
  };

  let { pageKey, app = false, children }: Props = $props();

  function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getFadeParams(): FadeParams {
    return {
      duration: prefersReducedMotion() ? 1 : 180,
      easing: cubicOut
    };
  }
</script>

{#key pageKey}
  <div
    class="page-transition-shell"
    class:page-transition-shell--app={app}
    data-page-state={pageKey}
    transition:fade={getFadeParams()}
  >
    {@render children()}
  </div>
{/key}

<style>
  .page-transition-shell {
    min-height: 100vh;
    background-color: var(--bg-color);
  }

  .page-transition-shell--app {
    height: 100vh;
    overflow: hidden;
  }
</style>
