<script lang="ts">
  import { defaultMarkdown } from '../lib/content/defaultMarkdown';

  const markdownScriptTag = 'script';
</script>

<!-- Svelte-owned default markdown template. The app bootstrap reads #default-markdown.textContent. -->
<svelte:element this={markdownScriptTag} type="text/markdown" id="default-markdown">{defaultMarkdown}</svelte:element>
