<script lang="ts">
  type MarkdownEditorTextareaProps = {
    value: string;
    direction: 'ltr' | 'rtl';
    onInput: (event: Event) => void;
    onSelection: (event: Event) => void;
    onScroll: (event: Event) => void;
  };

  let {
    value,
    direction,
    onInput,
    onSelection,
    onScroll
  }: MarkdownEditorTextareaProps = $props();
</script>

<textarea
  id="markdown-editor"
  value={value}
  dir={direction}
  placeholder="Type or paste your Markdown here..."
  oninput={onInput}
  onselect={onSelection}
  onkeyup={onSelection}
  onmouseup={onSelection}
  onfocus={onSelection}
  onscroll={onScroll}
></textarea>
