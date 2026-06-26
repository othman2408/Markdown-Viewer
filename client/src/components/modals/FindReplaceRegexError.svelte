<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
</script>

<div id="find-replace-error" class="find-error-drawer" style:display={modalState.findReplaceErrorVisible ? 'block' : 'none'}>
  <i class="bi bi-exclamation-triangle-fill me-1"></i> <span id="regex-error-msg">{modalState.findReplaceErrorMessage}</span>
</div>
