<script lang="ts">
  import type { ShareMode } from '../../lib/state/modals.svelte';

  type ShareModeCardProps = {
    mode: ShareMode;
    selected: boolean;
    iconClass: string;
    title: string;
    description: string;
    onselect: (mode: ShareMode) => void;
  };

  let { mode, selected, iconClass, title, description, onselect }: ShareModeCardProps = $props();
</script>

<label class="share-mode-card" class:is-selected={selected} id={`share-card-${mode}`} for={`share-mode-${mode}`}>
  <input type="radio" id={`share-mode-${mode}`} name="share-mode" value={mode} checked={selected} onchange={() => onselect(mode)} />
  <span class="share-card-icon"><i class={`bi ${iconClass}`}></i></span>
  <span class="share-card-body">
    <span class="share-card-title">{title}</span>
    <span class="share-card-desc">{description}</span>
  </span>
  <span class="share-card-check"><i class="bi bi-check-lg"></i></span>
</label>
