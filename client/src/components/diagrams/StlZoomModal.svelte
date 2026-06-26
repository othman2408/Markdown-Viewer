<script lang="ts">
  import StlZoomControls from './StlZoomControls.svelte';
</script>

<div id="stl-zoom-modal" role="dialog" aria-modal="true" aria-label="STL 3D model zoom view" aria-hidden="true">
  <div class="stl-modal-content">
    <div class="stl-modal-header">
      <span>3D Model Viewer</span>
      <button class="stl-modal-close" id="stl-zoom-modal-close" title="Close" aria-label="Close 3D modal">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="stl-modal-viewer" id="stl-modal-viewer"></div>
    <StlZoomControls />
  </div>
</div>
