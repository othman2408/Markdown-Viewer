<script lang="ts">
  import { MIN_PANE_PERCENT } from '../../lib/editor/paneResize';
  import { createResizeDividerController } from '../../lib/editor/resizeDividerBehavior';
  import { uiState } from '../../lib/state/ui.svelte';

  let editorWidthPercent = $state(50);
  let isResizing = $state(false);

  const resizeDividerController = createResizeDividerController({
    getEditorWidthPercent: () => editorWidthPercent,
    setEditorWidthPercent: (percent) => {
      editorWidthPercent = percent;
    },
    getIsResizing: () => isResizing,
    setIsResizing: (resizing) => {
      isResizing = resizing;
    },
    getViewMode: () => uiState.viewMode
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="resize-divider"
  class:dragging={isResizing}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize panes"
  aria-valuemin={MIN_PANE_PERCENT}
  aria-valuemax={100 - MIN_PANE_PERCENT}
  aria-valuenow={Math.round(editorWidthPercent)}
  tabindex="0"
  {@attach resizeDividerController.attach}
>
  <div class="resize-divider-handle"></div>
</div>
