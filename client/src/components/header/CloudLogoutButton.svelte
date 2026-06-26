<script lang="ts">
  import { cloudState } from '../../lib/state/cloud.svelte';
  import { dispatchLogout } from '../../lib/header/authBridge';
  import type { LogoutControlVariant } from '../../lib/header/authBridge';
  import CloudLogoutControl from './CloudLogoutControl.svelte';

  type CloudLogoutButtonProps = {
    variant?: LogoutControlVariant;
  };

  let { variant = 'desktop' }: CloudLogoutButtonProps = $props();
</script>

<CloudLogoutControl
  {variant}
  enabled={cloudState.enabled}
  busy={cloudState.logoutInFlight}
  onLogout={(event) => dispatchLogout(variant, event)}
/>
