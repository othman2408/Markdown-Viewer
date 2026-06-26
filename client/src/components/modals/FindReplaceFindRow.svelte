<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
  import FindReplaceOptionButton from './FindReplaceOptionButton.svelte';
</script>

<div class="find-replace-field-row">
  <div class="find-input-container">
    <input type="text" id="find-replace-input" class="find-input-field" placeholder="Find" aria-label="Find query" />
    <div class="find-options-group">
      <FindReplaceOptionButton id="find-case" title="Match Case (Aa)" ariaLabel="Match Case" pressed={modalState.findReplaceMatchCase} label="Aa" />
      <FindReplaceOptionButton id="find-word" title="Match Whole Word (W)" ariaLabel="Match Whole Word" pressed={modalState.findReplaceWholeWord} label="W" />
      <FindReplaceOptionButton id="find-regex" title="Use Regular Expression (.*)" ariaLabel="Use Regular Expression" pressed={modalState.findReplaceUseRegex} label=".*" />
      <FindReplaceOptionButton id="find-sel" title="Find in Selection (Sel)" ariaLabel="Find in Selection" pressed={modalState.findReplaceInSelection} iconClass="bi-align-start" />
    </div>
  </div>
</div>
