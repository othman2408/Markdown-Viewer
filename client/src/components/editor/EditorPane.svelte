<script lang="ts">
  import { editorState } from '../../lib/state/editor.svelte';
  import { createEditorInputSnapshot, mergeEditorInputSnapshot } from '../../lib/editor/inputSnapshot';
  import EditorDropHint from './EditorDropHint.svelte';
  import EditorHighlightLayer from './EditorHighlightLayer.svelte';
  import EditorLineNumbers from './EditorLineNumbers.svelte';
  import EditorSkeleton from './EditorSkeleton.svelte';
  import MarkdownEditorTextarea from './MarkdownEditorTextarea.svelte';

  function syncEditorSnapshot(textarea: HTMLTextAreaElement) {
    const snapshot = createEditorInputSnapshot(textarea);
    editorState.replace(mergeEditorInputSnapshot(editorState.snapshot, snapshot));
  }

  function handleEditorInput(event: Event) {
    syncEditorSnapshot(event.currentTarget as HTMLTextAreaElement);
  }

  function handleEditorSelection(event: Event) {
    syncEditorSnapshot(event.currentTarget as HTMLTextAreaElement);
  }

  function handleEditorScroll(event: Event) {
    syncEditorSnapshot(event.currentTarget as HTMLTextAreaElement);
  }

  let lineNumbers = $derived(editorState.lineNumbers);
  let lineNumberGutterStyle = $derived(`--line-number-gutter: ${lineNumbers.gutterCh}ch;`);
</script>

<div class="editor-pane is-loading" style={lineNumberGutterStyle}>
  <EditorLineNumbers {lineNumbers} />
  <EditorHighlightLayer />
  <EditorSkeleton />
  <MarkdownEditorTextarea
    value={editorState.value}
    direction={editorState.direction}
    onInput={handleEditorInput}
    onSelection={handleEditorSelection}
    onScroll={handleEditorScroll}
  />
  <EditorDropHint />
</div>
