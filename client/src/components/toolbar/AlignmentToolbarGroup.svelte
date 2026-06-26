<script lang="ts">
  import DirectionToggleButton from './DirectionToggleButton.svelte';
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group">
  <MarkdownToolButton action="align-left" title="Align left" ariaLabel="Align left" iconClass="bi-text-left" />
  <MarkdownToolButton action="align-center" title="Align center" ariaLabel="Align center" iconClass="bi-text-center" />
  <MarkdownToolButton action="align-right" title="Align right" ariaLabel="Align right" iconClass="bi-text-right" />
  <DirectionToggleButton />
</div>
