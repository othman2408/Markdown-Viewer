<script lang="ts">
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group heading-group">
  {#each ['1', '2', '3', '4', '5', '6'] as level}
    <MarkdownToolButton action="heading" level={level} title={`Heading ${level}`} ariaLabel={`Heading ${level}`} label={`H${level}`} textTool />
  {/each}
</div>
