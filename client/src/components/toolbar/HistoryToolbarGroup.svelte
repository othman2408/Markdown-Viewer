<script lang="ts">
  import { editorState } from '../../lib/state/editor.svelte';
  import MarkdownToolButton from './MarkdownToolButton.svelte';
</script>

<div class="markdown-toolbar-group">
  <MarkdownToolButton action="undo" title="Undo" ariaLabel="Undo" iconClass="bi-arrow-counterclockwise" disabled={!editorState.canUndo} />
  <MarkdownToolButton action="redo" title="Redo" ariaLabel="Redo" iconClass="bi-arrow-clockwise" disabled={!editorState.canRedo} />
  <MarkdownToolButton action="clear-formatting" title="Clear document" ariaLabel="Clear document" iconClass="bi-eraser" />
</div>
