<script lang="ts">
  import AboutModal from './AboutModal.svelte';
  import DiffPreviewModal from './DiffPreviewModal.svelte';
  import HelpModal from './HelpModal.svelte';
  import RenameModal from './RenameModal.svelte';
  import ShareModal from './ShareModal.svelte';
</script>

<!-- Svelte-owned document modal markup. Keep IDs/classes aligned with the stable DOM contract. -->
<DiffPreviewModal />
<HelpModal />
<AboutModal />
<ShareModal />
<RenameModal />
