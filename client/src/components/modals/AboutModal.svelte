<script lang="ts">
  import AboutModalBody from './AboutModalBody.svelte';
  import AboutModalFooter from './AboutModalFooter.svelte';
  import AboutModalHeader from './AboutModalHeader.svelte';
</script>

<div id="about-modal" class="reset-modal-overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="about-modal-title" aria-hidden="true" style="display:none;">
  <div class="reset-modal-box reset-modal-box--xl modal-box">
    <AboutModalHeader />
    <AboutModalBody />
    <AboutModalFooter />
  </div>
</div>
