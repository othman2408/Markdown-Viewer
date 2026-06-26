<script lang="ts">
  import { dispatchHeaderAction } from '../../lib/header/headerActionBridge';
</script>

<div class="dropdown">
  <button class="tool-button dropdown-toggle" type="button" id="exportDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Export Markdown">
    <i class="bi bi-download"></i> <span class="btn-text">Export</span>
  </button>
  <ul class="dropdown-menu" aria-labelledby="exportDropdown">
    <!-- svelte-ignore a11y_invalid_attribute -->
    <li><a class="dropdown-item" href="#" id="export-md" onclick={(event) => dispatchHeaderAction('exportMarkdown', 'desktop', event)}><i class="bi bi-file-earmark-text me-2"></i>Markdown (.md)</a></li>
    <!-- svelte-ignore a11y_invalid_attribute -->
    <li><a class="dropdown-item" href="#" id="export-html" onclick={(event) => dispatchHeaderAction('exportHtml', 'desktop', event)}><i class="bi bi-file-earmark-code me-2"></i>HTML</a></li>
    <!-- svelte-ignore a11y_invalid_attribute -->
    <li><a class="dropdown-item" href="#" id="export-pdf" onclick={(event) => dispatchHeaderAction('exportPdf', 'desktop', event)}><i class="bi bi-file-earmark-pdf me-2"></i>PDF</a></li>
    <!-- svelte-ignore a11y_invalid_attribute -->
    <li><a class="dropdown-item" href="#" id="export-png" onclick={(event) => dispatchHeaderAction('exportPng', 'desktop', event)}><i class="bi bi-file-earmark-image me-2"></i>Image (.png)</a></li>
  </ul>
</div>
