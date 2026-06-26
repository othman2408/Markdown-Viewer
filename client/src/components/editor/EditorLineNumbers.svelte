<script lang="ts">
  import type { LineNumberRenderState } from '../../lib/editor/lineNumbers';

  type EditorLineNumbersProps = {
    lineNumbers: LineNumberRenderState;
  };

  let { lineNumbers }: EditorLineNumbersProps = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div id="line-numbers" class="line-numbers" aria-hidden="true" inert>
  {#each lineNumbers.rows as row (row.lineIndex)}
    <div
      class="line-number"
      class:active-line={row.active}
      style={`height: ${row.heightPx}px;`}
    >{row.label}</div>
  {/each}
</div>
