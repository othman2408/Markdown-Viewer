<script lang="ts">
  import { tabMenuActions } from '../../lib/tabs/tabMenuActions';
  import type { TabMenuAction } from '../../lib/types/workspace';
  import TabMenuItem from './TabMenuItem.svelte';

  type TabMenuActionListProps = {
    onAction: (event: MouseEvent, action: TabMenuAction) => void;
  };

  let { onAction }: TabMenuActionListProps = $props();
</script>

{#each tabMenuActions as menuAction (menuAction.action)}
  <TabMenuItem
    action={menuAction.action}
    icon={menuAction.icon}
    label={menuAction.label}
    danger={menuAction.danger}
    onAction={onAction}
  />
{/each}
