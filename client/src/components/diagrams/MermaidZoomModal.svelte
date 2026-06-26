<script lang="ts">
  import MermaidZoomControls from './MermaidZoomControls.svelte';
</script>

<div id="mermaid-zoom-modal" role="dialog" aria-modal="true" aria-label="Diagram zoom view" aria-hidden="true">
  <div class="mermaid-modal-content">
    <div class="mermaid-modal-header">
      <span>Diagram</span>
      <button class="mermaid-modal-close" id="mermaid-modal-close" title="Close" aria-label="Close diagram modal">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="mermaid-modal-diagram" id="mermaid-modal-diagram"></div>
    <MermaidZoomControls />
  </div>
</div>
