<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
</script>

<div class="find-replace-actions-footer">
  <button type="button" class="fr-action-btn" id="find-replace-current" disabled={modalState.findReplaceMatchTotal === 0}>Replace</button>
  <button type="button" class="fr-action-btn" id="find-replace-all" disabled={!modalState.findReplaceHasQuery || modalState.findReplaceMatchTotal === 0}>Replace All</button>
  <button type="button" class="fr-action-btn secondary" id="find-replace-reset-footer" title="Reset Position">Reset</button>
  <button type="button" class="fr-action-btn secondary" id="find-replace-close">Close</button>
</div>
