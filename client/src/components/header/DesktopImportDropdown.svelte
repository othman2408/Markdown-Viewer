<script lang="ts">
  import { dispatchHeaderAction } from '../../lib/header/headerActionBridge';
</script>

<div class="dropdown">
  <button class="tool-button dropdown-toggle" type="button" id="importDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Import Markdown">
    <i class="bi bi-upload"></i> <span class="btn-text">Import</span>
  </button>
  <ul class="dropdown-menu" aria-labelledby="importDropdown">
    <!-- svelte-ignore a11y_invalid_attribute -->
    <li><a class="dropdown-item" href="#" id="import-from-file" onclick={(event) => dispatchHeaderAction('importFile', 'desktop', event)}><i class="bi bi-upload me-2"></i>From files</a></li>
    <!-- svelte-ignore a11y_invalid_attribute -->
    <li><a class="dropdown-item" href="#" id="import-from-github" onclick={(event) => dispatchHeaderAction('importGithub', 'desktop', event)}><i class="bi bi-github me-2"></i>From GitHub</a></li>
  </ul>
</div>
