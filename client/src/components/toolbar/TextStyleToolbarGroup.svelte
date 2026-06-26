<script lang="ts">
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group">
  <MarkdownToolButton action="bold" title="Bold" ariaLabel="Bold" iconClass="bi-type-bold" />
  <MarkdownToolButton action="strike" title="Strikethrough" ariaLabel="Strikethrough" iconClass="bi-type-strikethrough" />
  <MarkdownToolButton action="italic" title="Italic" ariaLabel="Italic" iconClass="bi-type-italic" />
  <MarkdownToolButton action="quote" title="Blockquote" ariaLabel="Blockquote" iconClass="bi-quote" />
  <MarkdownToolButton action="title-case" title="Title case" ariaLabel="Title case" label="Aa" textTool />
  <MarkdownToolButton action="uppercase" title="Uppercase" ariaLabel="Uppercase" label="A" textTool />
  <MarkdownToolButton action="lowercase" title="Lowercase" ariaLabel="Lowercase" label="a" textTool />
</div>
