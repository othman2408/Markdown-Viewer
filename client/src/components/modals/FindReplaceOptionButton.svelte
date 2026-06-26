<script lang="ts">
  type FindReplaceOptionButtonProps = {
    id: string;
    title: string;
    ariaLabel: string;
    pressed: boolean;
    label?: string;
    iconClass?: string;
  };

  let {
    id,
    title,
    ariaLabel,
    pressed,
    label,
    iconClass
  }: FindReplaceOptionButtonProps = $props();
</script>

<button
  type="button"
  class="find-option-btn"
  class:active={pressed}
  {id}
  {title}
  aria-label={ariaLabel}
  aria-pressed={pressed}
>
  {#if iconClass}
    <i class={`bi ${iconClass}`}></i>
  {:else}
    {label}
  {/if}
</button>
