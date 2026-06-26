<script lang="ts">
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group">
  <MarkdownToolButton action="fullscreen" title="Fullscreen" ariaLabel="Fullscreen" iconClass="bi-arrows-fullscreen" />
  <MarkdownToolButton action="find" title="Find &amp; Replace" ariaLabel="Find &amp; Replace" iconClass="bi-search" />
  <MarkdownToolButton action="help" title="Help" ariaLabel="Help" iconClass="bi-question-circle" />
  <MarkdownToolButton action="info" title="About Markdown" ariaLabel="About Markdown" iconClass="bi-info-circle" />
</div>
