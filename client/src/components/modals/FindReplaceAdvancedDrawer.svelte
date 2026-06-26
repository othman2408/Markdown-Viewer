<script lang="ts">
  import { modalState } from '../../lib/state/modals.svelte';
</script>

<div class="find-drawer-toggle-row">
  <button type="button" class="drawer-toggle-btn" id="fr-drawer-toggle" aria-expanded={modalState.findReplaceDrawerOpen}>
    <i class={`bi ${modalState.findReplaceDrawerOpen ? 'bi-chevron-down' : 'bi-chevron-right'} me-1`}></i> Advanced Options
  </button>
</div>

<div
  id="fr-drawer-content"
  class="find-replace-drawer-content"
  style:display={modalState.findReplaceDrawerOpen ? 'flex' : 'none'}
>
  <div class="drawer-field">
    <label for="find-replace-scope" class="drawer-label">Scope Filter</label>
    <select id="find-replace-scope" class="drawer-select">
      <option value="entire">Entire Document</option>
      <option value="heading">Headings only</option>
      <option value="code">Code blocks only</option>
      <option value="latex">LaTeX blocks only</option>
      <option value="mermaid">Mermaid blocks only</option>
      <option value="plain">Plain text only</option>
    </select>
  </div>
  <div class="drawer-field">
    <label for="find-replace-history" class="drawer-label">Search History</label>
    <select id="find-replace-history" class="drawer-select">
      <option value="">Recent queries...</option>
    </select>
  </div>
  <div class="drawer-field check-field">
    <input type="checkbox" id="find-replace-diff-toggle" class="drawer-checkbox" />
    <label for="find-replace-diff-toggle" class="drawer-label-checkbox">Show Diff Preview before replace</label>
  </div>
</div>
