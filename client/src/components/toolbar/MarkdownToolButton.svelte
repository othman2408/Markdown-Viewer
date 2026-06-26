<script lang="ts">
  import type { MarkdownFormatAction } from '../../lib/types/editor';
  import MarkdownToolButtonContent from './MarkdownToolButtonContent.svelte';

  type MarkdownToolButtonProps = {
    action: MarkdownFormatAction;
    title: string;
    ariaLabel: string;
    iconClass?: string;
    label?: string;
    level?: string;
    textTool?: boolean;
    disabled?: boolean;
    iconPlaceholder?: boolean;
  };

  let {
    action,
    title,
    ariaLabel,
    iconClass,
    label,
    level,
    textTool = false,
    disabled = false,
    iconPlaceholder = false
  }: MarkdownToolButtonProps = $props();
</script>

<button
  type="button"
  class="markdown-tool-btn"
  class:text-tool={textTool}
  class:disabled={disabled}
  data-md-action={action}
  data-md-level={level}
  {title}
  aria-label={ariaLabel}
  {disabled}
>
  <MarkdownToolButtonContent {iconClass} {label} {iconPlaceholder} />
</button>
