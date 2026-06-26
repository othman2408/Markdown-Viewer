<script lang="ts">
  import { headerStats, type HeaderStatKind } from '../../lib/header/headerStats';
  import { editorState } from '../../lib/state/editor.svelte';
  import HeaderStatItem from './HeaderStatItem.svelte';

  type HeaderStatsProps = {
    mobile?: boolean;
  };

  let { mobile = false }: HeaderStatsProps = $props();

  let readingTime = $derived(String(editorState.stats.readingTimeMinutes));
  let wordCount = $derived(editorState.stats.wordCount.toLocaleString());
  let charCount = $derived(editorState.stats.charCount.toLocaleString());

  function getStatValue(kind: HeaderStatKind): string {
    if (kind === 'readingTime') return readingTime;
    if (kind === 'wordCount') return wordCount;
    return charCount;
  }
</script>

{#if mobile}
  <div class="mobile-stats-container mb-3">
    {#each headerStats as stat (stat.id)}
      <HeaderStatItem {stat} value={getStatValue(stat.kind)} {mobile} />
    {/each}
  </div>
{:else}
  <div id="stats-container" class="stats-container d-flex align-items-center d-none d-md-flex">
    {#each headerStats as stat (stat.id)}
      <HeaderStatItem {stat} value={getStatValue(stat.kind)} {mobile} />
    {/each}
  </div>
{/if}
