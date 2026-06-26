<script lang="ts">
  import DragOverlay from './editor/DragOverlay.svelte';
  import EditorPane from './editor/EditorPane.svelte';
  import ResizeDivider from './editor/ResizeDivider.svelte';
  import PreviewPane from './preview/PreviewPane.svelte';
  import { uiState } from '../lib/state/ui.svelte';
</script>

<!-- Svelte-owned editor workspace markup. Keep IDs/classes aligned with the stable DOM contract. -->
<DragOverlay />

<main
  class="content-container"
  class:view-editor-only={uiState.viewMode === 'editor'}
  class:view-preview-only={uiState.viewMode === 'preview'}
  class:view-split={uiState.viewMode === 'split'}
>
  <EditorPane />
  <ResizeDivider />
  <PreviewPane />
</main>
