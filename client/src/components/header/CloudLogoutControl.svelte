<script lang="ts">
  import type { LogoutControlVariant } from '../../lib/header/authBridge';

  type CloudLogoutControlProps = {
    variant: LogoutControlVariant;
    enabled: boolean;
    busy: boolean;
    onLogout: (event: MouseEvent) => void;
  };

  let {
    variant,
    enabled,
    busy,
    onLogout
  }: CloudLogoutControlProps = $props();
</script>

{#if variant === 'mobile'}
  <button
    id="mobile-logout-button"
    class="mobile-menu-item"
    title="Logout"
    hidden={!enabled}
    disabled={busy}
    aria-busy={busy}
    onclick={onLogout}
  >
    <i class="bi bi-box-arrow-right me-2"></i> Logout
  </button>
{:else}
  <button
    id="logout-button"
    class="tool-button"
    title="Logout"
    aria-label="Logout"
    hidden={!enabled}
    disabled={busy}
    aria-busy={busy}
    onclick={onLogout}
  >
    <i class="bi bi-box-arrow-right"></i> <span class="btn-text">Logout</span>
  </button>
{/if}
