<script lang="ts">
  type MarkdownToolButtonContentProps = {
    iconClass?: string;
    label?: string;
    iconPlaceholder?: boolean;
  };

  let {
    iconClass,
    label,
    iconPlaceholder = false
  }: MarkdownToolButtonContentProps = $props();
</script>

{#if iconClass}
  <i class={`bi ${iconClass}`}></i>
{:else if iconPlaceholder}
  <i></i>
{:else}
  {label}
{/if}
