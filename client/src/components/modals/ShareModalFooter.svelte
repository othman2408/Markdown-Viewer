<script lang="ts">
  type ShareModalFooterProps = {
    onClose: () => void;
  };

  let { onClose }: ShareModalFooterProps = $props();
</script>

<div class="reset-modal-actions">
  <button class="reset-modal-btn reset-modal-cancel" id="share-modal-close" onclick={onClose}>Close</button>
</div>
