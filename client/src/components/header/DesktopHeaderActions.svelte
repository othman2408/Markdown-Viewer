<script lang="ts">
  import { dispatchHeaderAction } from '../../lib/header/headerActionBridge';
</script>

<button id="copy-markdown-button" class="tool-button" title="Copy Markdown" onclick={(event) => dispatchHeaderAction('copyMarkdown', 'desktop', event)}>
  <i class="bi bi-clipboard"></i> <span class="btn-text">Copy</span>
</button>

<button id="share-button" class="tool-button" title="Share via URL" onclick={(event) => dispatchHeaderAction('share', 'desktop', event)}>
  <i class="bi bi-share"></i> <span class="btn-text">Share</span>
</button>
