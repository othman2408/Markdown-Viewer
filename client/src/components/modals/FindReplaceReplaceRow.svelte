<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
  import FindReplaceOptionButton from './FindReplaceOptionButton.svelte';
</script>

<div class="find-replace-field-row">
  <div class="replace-input-container">
    <input type="text" id="find-replace-with" class="find-input-field" placeholder="Replace" aria-label="Replace with" />
    <div class="find-options-group">
      <FindReplaceOptionButton id="replace-preserve-case" title="Preserve Case (Ab)" ariaLabel="Preserve Case" pressed={modalState.findReplacePreserveCase} label="Ab" />
      <FindReplaceOptionButton id="find-wrap" title="Wrap Around (Wrap)" ariaLabel="Wrap Around" pressed={modalState.findReplaceWrapAround} label="Wrap" />
    </div>
  </div>
</div>
