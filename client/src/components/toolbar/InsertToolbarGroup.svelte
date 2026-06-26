<script lang="ts">
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group">
  <MarkdownToolButton action="link" title="Link" ariaLabel="Link" iconClass="bi-link-45deg" />
  <MarkdownToolButton action="reference" title="Reference" ariaLabel="Reference" textTool iconPlaceholder />
  <MarkdownToolButton action="image" title="Image" ariaLabel="Image" iconClass="bi-card-image" />
  <MarkdownToolButton action="inline-code" title="Inline code" ariaLabel="Inline code" iconClass="bi-code-slash" />
  <MarkdownToolButton action="code-block" title="Code block" ariaLabel="Code block" iconClass="bi-file-code" />
  <MarkdownToolButton action="terminal-block" title="Terminal block" ariaLabel="Terminal block" iconClass="bi-terminal" />
  <MarkdownToolButton action="table" title="Table" ariaLabel="Table" iconClass="bi-table" />
  <MarkdownToolButton action="date-time" title="Date and time" ariaLabel="Date and time" iconClass="bi-clock" />
  <MarkdownToolButton action="emoji" title="Emoji shortcode" ariaLabel="Emoji shortcode" iconClass="bi-emoji-smile" />
  <MarkdownToolButton action="symbols" title="Symbols &amp; HTML entities" ariaLabel="Symbols &amp; HTML entities" iconClass="bi-c-circle" />
  <MarkdownToolButton action="alert" title="Markdown alert" ariaLabel="Markdown alert" iconClass="bi-newspaper" />
</div>
