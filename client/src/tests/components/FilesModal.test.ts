// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FilesModal from '../../components/modals/FilesModal.svelte';
import { cloudState } from '../../lib/state/cloud.svelte';
import { fileLibraryState } from '../../lib/state/files.svelte';

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' }
  });
}

const file = {
  id: 'doc-1',
  title: 'Alpha Notes',
  content: '# Alpha\n\nSaved',
  contentLength: 15,
  contentPreview: '# Alpha',
  createdAt: 123,
  updatedAt: '2026-06-26T06:00:00.000Z',
  scrollPos: 0,
  viewMode: 'split' as const,
  versionCount: 1
};

const version = {
  id: 'version-1',
  documentId: 'doc-1',
  title: 'Alpha Notes',
  contentHash: 'hash',
  contentLength: 15,
  contentPreview: '# Alpha',
  source: 'autosave' as const,
  createdAt: '2026-06-26T06:00:00.000Z'
};

const versionDetail = {
  ...version,
  content: '# Alpha\n\nFull version content'
};

describe('FilesModal', () => {
  beforeEach(() => {
    cloudState.replace({
      enabled: true,
      csrfToken: 'csrf',
      saveInFlight: false,
      saveQueued: false,
      logoutInFlight: false,
      shareRequestSeq: 0
    });
    fileLibraryState.close();
  });

  afterEach(() => {
    cleanup();
    fileLibraryState.close();
    delete window.markdownViewerFiles;
    vi.unstubAllGlobals();
  });

  it('opens after an external file library state change', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/files?')) return jsonResponse({ files: [file] });
      if (url === '/api/files/doc-1/history/version-1') return jsonResponse(versionDetail);
      if (url === '/api/files/doc-1/history') return jsonResponse({ versions: [version] });
      if (url === '/api/files/doc-1') return jsonResponse(file);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);

    const { container } = render(FilesModal);
    expect(container.querySelector('#files-modal')).toBeNull();

    fileLibraryState.openModal();

    await waitFor(() => {
      expect(container.querySelector('#files-modal')).not.toBeNull();
    });
    expect(container.querySelector('#files-modal')?.classList.contains('is-visible')).toBe(true);
    await waitFor(() => {
      expect(container.querySelector('.files-list-title')?.textContent).toBe('Alpha Notes');
    });
  });

  it('loads files and dispatches restore/copy/delete actions', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/files?')) return jsonResponse({ files: [file] });
      if (url === '/api/files/doc-1/history/version-1') return jsonResponse(versionDetail);
      if (url === '/api/files/doc-1/history') return jsonResponse({ versions: [version] });
      if (url === '/api/files/doc-1') return jsonResponse(file);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);
    vi.stubGlobal('confirm', vi.fn(() => true));
    window.markdownViewerFiles = {
      deleteFile: vi.fn(async () => {}),
      openFile: vi.fn(async () => {}),
      restoreVersion: vi.fn(async () => {})
    };

    fileLibraryState.openModal();
    const { container } = render(FilesModal);

    await waitFor(() => {
      expect(container.querySelector('.files-list-title')?.textContent).toBe('Alpha Notes');
    });
    await waitFor(() => {
      expect(container.querySelectorAll<HTMLButtonElement>('.files-version-actions .reset-modal-btn')).toHaveLength(3);
    });

    await fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.files-version-actions .reset-modal-btn')[1]);
    expect(window.markdownViewerFiles.restoreVersion).toHaveBeenCalledWith('doc-1', 'version-1', 'replace');

    await fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.files-version-actions .reset-modal-btn')[2]);
    expect(window.markdownViewerFiles.restoreVersion).toHaveBeenCalledWith('doc-1', 'version-1', 'copy');

    await fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.files-actions .reset-modal-btn')[1]);
    expect(window.confirm).toHaveBeenCalledWith('Delete "Alpha Notes"?');
    expect(window.markdownViewerFiles.deleteFile).toHaveBeenCalledWith('doc-1');
  });

  it('keeps a single history version anchored instead of stretched', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/files?')) return jsonResponse({ files: [file] });
      if (url === '/api/files/doc-1/history/version-1') return jsonResponse(versionDetail);
      if (url === '/api/files/doc-1/history') return jsonResponse({ versions: [version] });
      if (url === '/api/files/doc-1') return jsonResponse(file);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);

    fileLibraryState.openModal();
    const { container } = render(FilesModal);

    await waitFor(() => {
      expect(container.querySelectorAll('.files-version')).toHaveLength(1);
    });

    const versionList = container.querySelector<HTMLElement>('.files-version-list');
    expect(versionList).not.toBeNull();
    expect(versionList!.classList.contains('single-version')).toBe(true);
  });

  it('loads a full version preview in a modal before restore or copy', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/files?')) return jsonResponse({ files: [file] });
      if (url === '/api/files/doc-1/history/version-1') return jsonResponse(versionDetail);
      if (url === '/api/files/doc-1/history') return jsonResponse({ versions: [version] });
      if (url === '/api/files/doc-1') return jsonResponse(file);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);

    fileLibraryState.openModal();
    const { container } = render(FilesModal);

    await waitFor(() => {
      expect(container.querySelectorAll<HTMLButtonElement>('.files-version-actions .reset-modal-btn')).toHaveLength(3);
    });

    const previewButton = container.querySelector<HTMLButtonElement>('.files-version-actions .reset-modal-btn')!;
    await fireEvent.click(previewButton);

    await waitFor(() => {
      expect(container.querySelector('#version-preview-modal')).not.toBeNull();
    });
    await waitFor(() => {
      expect(container.querySelector('.files-version-preview-content')?.textContent).toBe('# Alpha\n\nFull version content');
    });
    expect(fetcher).toHaveBeenCalledWith('/api/files/doc-1/history/version-1', expect.any(Object));

    await fireEvent.click(container.querySelector<HTMLButtonElement>('#version-preview-modal .modal-close-btn')!);
    expect(container.querySelector('#version-preview-modal')).toBeNull();
  });

  it('dispatches open and closes the modal', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/files?')) return jsonResponse({ files: [file] });
      if (url === '/api/files/doc-1/history/version-1') return jsonResponse(versionDetail);
      if (url === '/api/files/doc-1/history') return jsonResponse({ versions: [version] });
      if (url === '/api/files/doc-1') return jsonResponse(file);
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetcher);
    window.markdownViewerFiles = {
      deleteFile: vi.fn(async () => {}),
      openFile: vi.fn(async () => {}),
      restoreVersion: vi.fn(async () => {})
    };

    fileLibraryState.openModal();
    const { container } = render(FilesModal);

    await waitFor(() => {
      expect(container.querySelector('.files-list-title')?.textContent).toBe('Alpha Notes');
    });
    await waitFor(() => {
      expect(container.querySelector<HTMLButtonElement>('.files-actions .reset-modal-btn')).not.toBeNull();
    });

    await fireEvent.click(container.querySelector<HTMLButtonElement>('.files-actions .reset-modal-btn')!);

    expect(window.markdownViewerFiles.openFile).toHaveBeenCalledWith('doc-1');
    expect(fileLibraryState.open).toBe(false);
  });
});
