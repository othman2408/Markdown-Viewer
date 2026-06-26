<script lang="ts">
  import HelpModalBody from './HelpModalBody.svelte';
  import HelpModalFooter from './HelpModalFooter.svelte';
  import HelpModalHeader from './HelpModalHeader.svelte';
</script>

<div id="help-modal" class="reset-modal-overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="help-modal-title" aria-hidden="true" style="display:none;">
  <div class="reset-modal-box reset-modal-box--xl modal-box">
    <HelpModalHeader />
    <HelpModalBody />
    <HelpModalFooter />
  </div>
</div>
