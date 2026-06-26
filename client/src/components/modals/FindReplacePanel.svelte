<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
  import FindReplaceActionsFooter from './FindReplaceActionsFooter.svelte';
  import FindReplaceAdvancedDrawer from './FindReplaceAdvancedDrawer.svelte';
  import FindReplaceFindRow from './FindReplaceFindRow.svelte';
  import FindReplaceHeader from './FindReplaceHeader.svelte';
  import FindReplaceMetaRow from './FindReplaceMetaRow.svelte';
  import FindReplaceRegexError from './FindReplaceRegexError.svelte';
  import FindReplaceReplaceRow from './FindReplaceReplaceRow.svelte';
</script>

<!-- Svelte-owned find/replace panel markup. Keep IDs/classes aligned with the stable DOM contract. -->
<!-- Find & Replace Floating Panel -->
<div
  id="find-replace-modal"
  class="find-replace-panel"
  class:docked={modalState.findReplaceDocked}
  role="region"
  aria-label="Find and Replace"
  style:display={modalState.findReplaceOpen ? 'flex' : 'none'}
>
  <FindReplaceHeader />
  <div class="find-replace-body">
    <FindReplaceFindRow />
    <FindReplaceRegexError />
    <FindReplaceReplaceRow />
    <FindReplaceMetaRow />
    <FindReplaceAdvancedDrawer />
  </div>
  <FindReplaceActionsFooter />
</div>
