<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createCloudClient } from '../../lib/cloud/client';
  import {
    dispatchFileDelete,
    dispatchFileOpen,
    dispatchFileVersionRestore
  } from '../../lib/files/fileLibraryBridge';
  import { cloudState } from '../../lib/state/cloud.svelte';
  import { fileLibraryState } from '../../lib/state/files.svelte';
  import type { DocumentVersion, FileDetail, FileSummary } from '../../lib/types/cloud';

  const client = createCloudClient({
    getCsrfToken: () => cloudState.csrfToken
  });

  let query = $state('');
  let files = $state<FileSummary[]>([]);
  let selectedFile = $state<FileDetail | null>(null);
  let versions = $state<DocumentVersion[]>([]);
  let errorMessage = $state('');
  let loadingFiles = $state(false);
  let loadingDetails = $state(false);
  let loadingVersionPreviewId = $state<string | null>(null);
  let actionBusy = $state(false);
  let opened = $state(false);
  let previewedVersionId = $state<string | null>(null);
  let versionPreviewContent = $state<Record<string, string>>({});
  let fileState = $state(fileLibraryState.snapshot);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let searchInput: HTMLInputElement | null = $state(null);
  let versionPreviewCloseButton: HTMLButtonElement | null = $state(null);
  let isBusy = $derived(loadingFiles || loadingDetails || Boolean(loadingVersionPreviewId) || actionBusy || fileState.busy);
  let previewedVersion = $derived(versions.find((version) => version.id === previewedVersionId) ?? null);

  const unsubscribeFileLibraryState = fileLibraryState.subscribe((value) => {
    fileState = value;
  });

  onDestroy(unsubscribeFileLibraryState);

  $effect(() => {
    if (fileState.open && !opened) {
      opened = true;
      query = '';
      selectedFile = null;
      versions = [];
      previewedVersionId = null;
      versionPreviewContent = {};
      void loadFiles('');
      setTimeout(() => searchInput?.focus(), 0);
    } else if (!fileState.open) {
      opened = false;
      errorMessage = '';
    }
  });

  function close(): void {
    fileLibraryState.close();
  }

  function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatBytes(value: number): string {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  function getVersionPreviewButtonLabel(version: DocumentVersion): string {
    if (loadingVersionPreviewId === version.id) return 'Loading...';
    return 'Preview';
  }

  function handleSearchInput(event: Event): void {
    query = (event.currentTarget as HTMLInputElement).value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadFiles(query);
    }, 220);
  }

  async function loadFiles(searchQuery = query): Promise<void> {
    loadingFiles = true;
    errorMessage = '';
    try {
      const response = await client.listFiles({ query: searchQuery, limit: 50 });
      files = response.files;
      if (!files.length) {
        selectedFile = null;
        versions = [];
        previewedVersionId = null;
        versionPreviewContent = {};
        return;
      }
      if (!selectedFile || !files.some((file) => file.id === selectedFile?.id)) {
        await selectFile(files[0]);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not load files.';
    } finally {
      loadingFiles = false;
    }
  }

  async function selectFile(file: FileSummary): Promise<void> {
    loadingDetails = true;
    errorMessage = '';
    try {
      const [detail, history] = await Promise.all([
        client.getFile(file.id),
        client.getFileHistory(file.id)
      ]);
      selectedFile = detail;
      versions = history.versions;
      previewedVersionId = null;
      versionPreviewContent = {};
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not load file history.';
    } finally {
      loadingDetails = false;
    }
  }

  async function openSelectedFile(): Promise<void> {
    if (!selectedFile) return;
    actionBusy = true;
    errorMessage = '';
    try {
      await dispatchFileOpen(selectedFile.id);
      close();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not open file.';
    } finally {
      actionBusy = false;
    }
  }

  async function deleteSelectedFile(): Promise<void> {
    if (!selectedFile) return;
    const confirmed = window.confirm(`Delete "${selectedFile.title}"?`);
    if (!confirmed) return;
    actionBusy = true;
    errorMessage = '';
    try {
      await dispatchFileDelete(selectedFile.id);
      selectedFile = null;
      versions = [];
      previewedVersionId = null;
      versionPreviewContent = {};
      await loadFiles(query);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not delete file.';
    } finally {
      actionBusy = false;
    }
  }

  async function restoreVersion(version: DocumentVersion, mode: 'replace' | 'copy'): Promise<void> {
    if (!selectedFile) return;
    actionBusy = true;
    errorMessage = '';
    try {
      await dispatchFileVersionRestore(selectedFile.id, version.id, mode);
      await loadFiles(query);
      previewedVersionId = null;
      versionPreviewContent = {};
      if (mode === 'replace') {
        const refreshed = await client.getFile(selectedFile.id);
        selectedFile = refreshed;
        const history = await client.getFileHistory(selectedFile.id);
        versions = history.versions;
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not restore version.';
    } finally {
      actionBusy = false;
    }
  }

  function closeVersionPreview(): void {
    previewedVersionId = null;
  }

  async function openVersionPreview(version: DocumentVersion): Promise<void> {
    if (!selectedFile) return;

    previewedVersionId = version.id;
    errorMessage = '';
    setTimeout(() => versionPreviewCloseButton?.focus(), 0);
    if (Object.prototype.hasOwnProperty.call(versionPreviewContent, version.id)) return;

    loadingVersionPreviewId = version.id;
    try {
      const detail = await client.getFileVersion(selectedFile.id, version.id);
      versionPreviewContent = {
        ...versionPreviewContent,
        [version.id]: detail.content
      };
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Could not load version preview.';
      previewedVersionId = null;
    } finally {
      loadingVersionPreviewId = null;
    }
  }

  function handleOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) close();
  }

  function handleVersionPreviewOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) closeVersionPreview();
  }

  function handleOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close();
  }

  function handleVersionPreviewKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeVersionPreview();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (!fileState.open || event.key !== 'Escape') return;
    if (previewedVersionId) {
      closeVersionPreview();
      return;
    }
    close();
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if fileState.open}
  <div
    id="files-modal"
    class="reset-modal-overlay modal-overlay files-modal-overlay is-visible"
    role="dialog"
    aria-modal="true"
    aria-labelledby="files-modal-title"
    tabindex="-1"
    onclick={handleOverlayClick}
    onkeydown={handleOverlayKeydown}
  >
    <section class="files-modal" aria-busy={isBusy}>
      <header class="files-modal-header">
        <div>
          <p id="files-modal-title" class="files-title">Files</p>
          <p class="files-subtitle">{files.length} saved document{files.length === 1 ? '' : 's'}</p>
        </div>
        <button type="button" class="modal-close-btn" aria-label="Close files" onclick={close}>
          <i class="bi bi-x-lg"></i>
        </button>
      </header>

      <div class="files-search-row">
        <i class="bi bi-search"></i>
        <input
          bind:this={searchInput}
          id="files-search"
          type="search"
          placeholder="Search files"
          value={query}
          oninput={handleSearchInput}
        />
      </div>

      {#if errorMessage}
        <div class="files-error" role="alert">{errorMessage}</div>
      {/if}

      <div class="files-body">
        <div class="files-list" aria-label="Saved files">
          {#if loadingFiles && files.length === 0}
            <div class="files-empty">Loading files...</div>
          {:else if files.length === 0}
            <div class="files-empty">No files found.</div>
          {:else}
            {#each files as file (file.id)}
              <button
                type="button"
                class:selected={selectedFile?.id === file.id}
                class="files-list-item"
                onclick={() => selectFile(file)}
              >
                <span class="files-list-title">{file.title}</span>
                <span class="files-list-meta">
                  {formatDate(file.updatedAt)} · {formatBytes(file.contentLength)} · {file.versionCount} versions
                </span>
                <span class="files-list-preview">{file.contentPreview || 'Empty document'}</span>
              </button>
            {/each}
          {/if}
        </div>

        <div class="files-detail">
          {#if selectedFile}
            <div class="files-detail-head">
              <div>
                <p class="files-detail-title">{selectedFile.title}</p>
                <p class="files-detail-meta">
                  Updated {formatDate(selectedFile.updatedAt)} · {formatBytes(selectedFile.contentLength)}
                </p>
              </div>
              <div class="files-actions">
                <button type="button" class="reset-modal-btn" disabled={isBusy} onclick={openSelectedFile}>Open</button>
                <button type="button" class="reset-modal-btn reset-modal-cancel" disabled={isBusy} onclick={deleteSelectedFile}>Delete</button>
              </div>
            </div>

            <pre class="files-preview">{selectedFile.content || 'Empty document'}</pre>

            <div class="files-history-head">
              <p class="files-section-title">History</p>
              {#if loadingDetails}
                <span class="files-loading">Loading...</span>
              {/if}
            </div>

            <div class={versions.length === 1 ? 'files-version-list single-version' : 'files-version-list'}>
              {#if versions.length === 0}
                <div class="files-empty">No versions yet.</div>
              {:else}
                {#each versions as version (version.id)}
                  <article class="files-version">
                    <div class="files-version-copy">
                      <strong>{version.title}</strong>
                      <span>{formatDate(version.createdAt)} · {version.source} · {formatBytes(version.contentLength)}</span>
                      <p>{version.contentPreview || 'Empty document'}</p>
                    </div>
                    <div class="files-version-actions">
                      <button
                        type="button"
                        class="reset-modal-btn reset-modal-cancel"
                        disabled={isBusy}
                        aria-haspopup="dialog"
                        onclick={() => openVersionPreview(version)}
                      >
                        {getVersionPreviewButtonLabel(version)}
                      </button>
                      <button
                        type="button"
                        class="reset-modal-btn"
                        disabled={isBusy}
                        onclick={() => restoreVersion(version, 'replace')}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        class="reset-modal-btn reset-modal-cancel"
                        disabled={isBusy}
                        onclick={() => restoreVersion(version, 'copy')}
                      >
                        Open copy
                      </button>
                    </div>
                  </article>
                {/each}
              {/if}
            </div>
          {:else}
            <div class="files-empty files-empty-detail">Select a file.</div>
          {/if}
        </div>
      </div>
    </section>

    {#if previewedVersion}
      <div
        id="version-preview-modal"
        class="files-version-preview-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-preview-title"
        tabindex="-1"
        onclick={handleVersionPreviewOverlayClick}
        onkeydown={handleVersionPreviewKeydown}
      >
        <section class="files-version-preview-modal" aria-busy={loadingVersionPreviewId === previewedVersion.id}>
          <header class="files-version-preview-header">
            <div>
              <p id="version-preview-title" class="files-version-preview-title">{previewedVersion.title}</p>
              <p class="files-version-preview-meta">
                {formatDate(previewedVersion.createdAt)} Â· {previewedVersion.source} Â· {formatBytes(previewedVersion.contentLength)}
              </p>
            </div>
            <button bind:this={versionPreviewCloseButton} type="button" class="modal-close-btn" aria-label="Close version preview" onclick={closeVersionPreview}>
              <i class="bi bi-x-lg"></i>
            </button>
          </header>

          <pre class="files-version-preview-content">{versionPreviewContent[previewedVersion.id] ?? 'Loading preview...'}</pre>
        </section>
      </div>
    {/if}
  </div>
{/if}

<style>
  .files-modal-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .files-modal {
    width: min(1180px, 100%);
    max-height: min(820px, calc(100vh - 48px));
    display: grid;
    grid-template-rows: auto auto auto 1fr;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-color);
    color: var(--text-color);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.46);
  }

  .files-modal-header,
  .files-detail-head,
  .files-history-head,
  .files-actions,
  .files-version-actions {
    display: flex;
    align-items: center;
  }

  .files-modal-header,
  .files-detail-head,
  .files-history-head {
    justify-content: space-between;
    gap: 12px;
  }

  .files-title,
  .files-detail-title,
  .files-section-title {
    margin: 0;
    font-weight: 700;
    line-height: 1.25;
  }

  .files-title {
    font-size: 18px;
  }

  .files-subtitle,
  .files-detail-meta,
  .files-list-meta,
  .files-version span,
  .files-loading {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .files-subtitle {
    margin: 3px 0 0;
  }

  .files-search-row {
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--editor-bg);
  }

  .files-search-row input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text-color);
    font: inherit;
  }

  .files-error {
    padding: 10px 12px;
    border: 1px solid rgba(248, 81, 73, 0.38);
    border-radius: 6px;
    background: rgba(248, 81, 73, 0.12);
    color: #ff7b72;
    font-size: 13px;
  }

  .files-body {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(260px, 0.36fr) minmax(0, 1fr);
    gap: 14px;
  }

  .files-list,
  .files-detail {
    min-height: 0;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--editor-bg);
  }

  .files-list {
    display: flex;
    flex-direction: column;
  }

  .files-list-item {
    width: 100%;
    display: grid;
    gap: 5px;
    padding: 12px;
    border: 0;
    border-bottom: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-color);
    text-align: left;
    cursor: pointer;
  }

  .files-list-item:hover,
  .files-list-item.selected {
    background: var(--button-hover);
  }

  .files-list-item.selected {
    box-shadow: inset 3px 0 0 var(--accent-color);
  }

  .files-list-title,
  .files-list-preview,
  .files-version-copy p {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .files-list-title {
    white-space: nowrap;
    font-weight: 700;
  }

  .files-list-preview,
  .files-version-copy p {
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.35;
  }

  .files-detail {
    display: grid;
    grid-template-rows: auto minmax(120px, 0.38fr) auto minmax(160px, 1fr);
    gap: 14px;
    padding: 14px;
  }

  .files-actions,
  .files-version-actions {
    gap: 8px;
  }

  .files-preview {
    min-height: 0;
    margin: 0;
    padding: 12px;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-color);
    color: var(--text-secondary);
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: pre-wrap;
  }

  .files-version-preview-overlay {
    position: fixed;
    inset: 0;
    z-index: 2200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.55);
  }

  .files-version-preview-modal {
    width: min(860px, 100%);
    max-height: min(720px, calc(100vh - 48px));
    display: grid;
    grid-template-rows: auto minmax(220px, 1fr);
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-color);
    color: var(--text-color);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  }

  .files-version-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .files-version-preview-title {
    margin: 0;
    font-weight: 700;
    line-height: 1.25;
  }

  .files-version-preview-meta {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: 12px;
  }

  .files-version-preview-content {
    min-height: 0;
    margin: 0;
    padding: 12px;
    overflow: auto;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--editor-bg);
    color: var(--text-secondary);
    font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    white-space: pre-wrap;
  }

  .files-version-list {
    min-height: 0;
    overflow: auto;
    display: grid;
    align-content: start;
    align-items: start;
    gap: 10px;
  }

  .files-version-list.single-version {
    grid-auto-rows: max-content;
  }

  .files-version {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-color);
  }

  .files-version-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .files-version-copy p {
    margin: 0;
  }

  .files-empty {
    padding: 18px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .files-empty-detail {
    align-self: center;
    justify-self: center;
  }

  @media (max-width: 760px) {
    .files-modal-overlay {
      padding: 10px;
      align-items: stretch;
    }

    .files-modal {
      max-height: calc(100vh - 20px);
      padding: 12px;
    }

    .files-version-preview-overlay {
      padding: 10px;
    }

    .files-version-preview-modal {
      max-height: calc(100vh - 20px);
      padding: 12px;
    }

    .files-body {
      grid-template-columns: 1fr;
      grid-template-rows: minmax(160px, 0.45fr) minmax(0, 1fr);
    }

    .files-detail-head,
    .files-version {
      grid-template-columns: 1fr;
    }

    .files-detail-head,
    .files-version-actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
