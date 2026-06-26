<script lang="ts">
  type TabMenuToggleButtonProps = {
    title: string;
    menuId: string;
    isOpen: boolean;
    tabId: string;
    mobile: boolean;
    onToggle: (event: MouseEvent) => void;
  };

  let { title, menuId, isOpen, tabId, mobile, onToggle }: TabMenuToggleButtonProps = $props();
</script>

<button
  type="button"
  class="tab-menu-btn"
  aria-label={`File options for ${title}`}
  aria-haspopup="menu"
  aria-expanded={isOpen}
  aria-controls={menuId}
  class:open={isOpen}
  data-tab-id={tabId}
  data-mobile-menu={mobile ? 'true' : undefined}
  draggable="false"
  title="File options"
  onclick={onToggle}
>
  <i class="bi bi-three-dots" aria-hidden="true"></i>
</button>
