<script lang="ts">
  import type { TabMenuAction } from '../../lib/types/workspace';

  type TabMenuItemProps = {
    action: TabMenuAction;
    icon: string;
    label: string;
    danger?: boolean;
    onAction: (event: MouseEvent, action: TabMenuAction) => void;
  };

  let { action, icon, label, danger = false, onAction }: TabMenuItemProps = $props();
</script>

<button
  type="button"
  class="tab-menu-item"
  class:tab-menu-item-danger={danger}
  role="menuitem"
  data-action={action}
  onclick={(event) => onAction(event, action)}
>
  <i class={`bi ${icon}`}></i> {label}
</button>
