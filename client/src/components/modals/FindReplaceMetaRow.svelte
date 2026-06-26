<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
</script>

<div class="find-replace-meta-row">
  <span id="find-replace-count" class="find-match-count" role="status" aria-live="polite">{modalState.findReplaceMatchCurrent} of {modalState.findReplaceMatchTotal} matches</span>
  <div class="find-nav-group">
    <button type="button" class="find-nav-arrow-btn" id="find-prev" title="Previous match (Shift+Enter)" aria-label="Previous match" disabled={modalState.findReplaceMatchTotal === 0}>
      <i class="bi bi-chevron-up"></i>
    </button>
    <button type="button" class="find-nav-arrow-btn" id="find-next" title="Next match (Enter)" aria-label="Next match" disabled={modalState.findReplaceMatchTotal === 0}>
      <i class="bi bi-chevron-down"></i>
    </button>
  </div>
</div>
