<script lang="ts">
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group">
  <MarkdownToolButton action="unordered-list" title="Bulleted list" ariaLabel="Bulleted list" iconClass="bi-list-ul" />
  <MarkdownToolButton action="ordered-list" title="Numbered list" ariaLabel="Numbered list" iconClass="bi-list-ol" />
  <MarkdownToolButton action="horizontal-rule" title="Horizontal rule" ariaLabel="Horizontal rule" iconClass="bi-dash-lg" />
</div>
