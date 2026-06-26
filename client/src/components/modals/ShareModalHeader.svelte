<script lang="ts">
  type ShareModalHeaderProps = {
    onClose: () => void;
  };

  let { onClose }: ShareModalHeaderProps = $props();
</script>

<div class="modal-header">
  <p id="share-modal-title" class="reset-modal-message">Share Document</p>
  <button type="button" class="modal-close-btn" id="share-modal-close-icon" aria-label="Close share dialog" onclick={onClose}>
    <i class="bi bi-x-lg"></i>
  </button>
</div>
