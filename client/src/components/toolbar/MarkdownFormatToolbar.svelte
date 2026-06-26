<script lang="ts">
  import { createMarkdownToolbarCommandController } from '../../lib/toolbar/controller';
  import { createMarkdownToolbarDispatchAttachment } from '../../lib/toolbar/dispatchAttachment';
  import { dispatchDirectionToggle, dispatchMarkdownToolbarAction } from '../../lib/toolbar/markdownToolbarBridge';
  import MarkdownToolbarGroups from './MarkdownToolbarGroups.svelte';

  const commandController = createMarkdownToolbarCommandController({
    runMarkdownTool: dispatchMarkdownToolbarAction,
    toggleContentDirection: dispatchDirectionToggle
  });

  const toolbarDispatch = createMarkdownToolbarDispatchAttachment(commandController);
</script>

<!-- Markdown Formatting Toolbar -->
<div
  class="markdown-format-toolbar"
  id="markdown-format-toolbar"
  role="toolbar"
  aria-label="Markdown formatting toolbar"
  {@attach toolbarDispatch}
>
  <MarkdownToolbarGroups />
</div>
