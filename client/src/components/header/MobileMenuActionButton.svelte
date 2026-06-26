<script lang="ts">
  import type { HeaderAction } from '../../lib/header/headerActionBridge';
  import { dispatchHeaderAction } from '../../lib/header/headerActionBridge';

  type MobileMenuActionButtonProps = {
    id: string;
    title: string;
    action: HeaderAction;
    icon: string;
    label: string;
  };

  let { id, title, action, icon, label }: MobileMenuActionButtonProps = $props();
</script>

<button id={id} class="mobile-menu-item" title={title} onclick={(event) => dispatchHeaderAction(action, 'mobile', event)}>
  <i class={`bi ${icon} me-2`}></i> {label}
</button>
