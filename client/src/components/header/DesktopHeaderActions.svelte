<script lang="ts">
  import { dispatchHeaderAction } from '../../lib/header/headerActionBridge';
</script>

<button id="copy-markdown-button" class="tool-button" title="Copy Markdown" onclick={(event) => dispatchHeaderAction('copyMarkdown', 'desktop', event)}>
  <i class="bi bi-clipboard"></i> <span class="btn-text">Copy</span>
</button>

<button id="files-button" class="tool-button" title="Files" onclick={(event) => dispatchHeaderAction('files', 'desktop', event)}>
  <i class="bi bi-folder2-open"></i> <span class="btn-text">Files</span>
</button>

<button id="share-button" class="tool-button" title="Share via URL" onclick={(event) => dispatchHeaderAction('share', 'desktop', event)}>
  <i class="bi bi-share"></i> <span class="btn-text">Share</span>
</button>
