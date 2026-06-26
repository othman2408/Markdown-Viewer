<script lang="ts">
  import { editorState } from '../../lib/state/editor.svelte';

  let isRtl = $derived(editorState.direction === 'rtl');
  let directionToggleLabel = $derived(isRtl ? 'Switch to LTR' : 'Switch to RTL');
</script>

<button
  type="button"
  id="direction-toggle"
  class="markdown-tool-btn text-tool"
  title={directionToggleLabel}
  aria-label={directionToggleLabel}
  aria-pressed={isRtl}
>
  {isRtl ? 'R' : 'L'}
</button>
