// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createGitHubImportModalController } from '../../../lib/modals/githubImportModalController';
import type { GitHubImportClient } from '../../../lib/modals/githubImport';

function createElements() {
  const modal = document.createElement('div');
  const title = document.createElement('h2');
  const urlInput = document.createElement('input');
  const fileSelect = document.createElement('select');
  const selectionToolbar = document.createElement('div');
  const tree = document.createElement('div');
  const error = document.createElement('p');
  const selectedCount = document.createElement('span');
  const selectAllButton = document.createElement('button');
  const cancelButton = document.createElement('button');
  const submitButton = document.createElement('button');

  submitButton.textContent = 'Import';
  return {
    cancelButton,
    error,
    fileSelect,
    modal,
    selectAllButton,
    selectedCount,
    selectionToolbar,
    submitButton,
    title,
    tree,
    urlInput
  };
}

function createClient(input: Partial<Pick<GitHubImportClient, 'fetchTextContent' | 'getDefaultBranch' | 'listMarkdownFiles'>> = {}) {
  return {
    fetchTextContent: vi.fn(async () => '# Imported'),
    getDefaultBranch: vi.fn(async () => 'main'),
    listMarkdownFiles: vi.fn(async () => ['README.md', 'docs/setup.md']),
    ...input
  } satisfies Pick<GitHubImportClient, 'fetchTextContent' | 'getDefaultBranch' | 'listMarkdownFiles'>;
}

function createController(input: {
  client?: Pick<GitHubImportClient, 'fetchTextContent' | 'getDefaultBranch' | 'listMarkdownFiles'>;
  elements?: ReturnType<typeof createElements>;
} = {}) {
  const elements = input.elements ?? createElements();
  const announce = vi.fn<(message: string) => void>();
  const closeAppModal = vi.fn<(modal: HTMLElement | null | undefined) => void>();
  const importDocument = vi.fn<(markdown: string, title: string) => void>();
  const openAppModal = vi.fn();
  const consoleRef = {
    error: vi.fn()
  };
  const controller = createGitHubImportModalController({
    announce,
    client: input.client ?? createClient(),
    closeAppModal,
    consoleRef,
    elements,
    importDocument,
    openAppModal
  });

  return {
    announce,
    closeAppModal,
    consoleRef,
    controller,
    elements,
    importDocument,
    openAppModal
  };
}

describe('GitHub import modal controller', () => {
  it('opens by resetting modal state and delegating to the app modal lifecycle', () => {
    const context = createController();
    context.elements.urlInput.value = 'https://github.com/acme/docs';
    context.elements.fileSelect.innerHTML = '<option>README.md</option>';
    context.elements.selectionToolbar.style.display = 'flex';
    context.elements.tree.innerHTML = '<button>README.md</button>';
    context.elements.submitButton.dataset.step = 'select';
    context.elements.submitButton.dataset.owner = 'acme';

    expect(context.controller.open()).toBe(true);

    expect(context.elements.urlInput.value).toBe('');
    expect(context.elements.fileSelect.innerHTML).toBe('');
    expect(context.elements.selectionToolbar.style.display).toBe('none');
    expect(context.elements.submitButton.dataset.step).toBe('url');
    expect(context.elements.submitButton.dataset.owner).toBeUndefined();
    expect(context.openAppModal).toHaveBeenCalledWith(context.elements.modal, {
      focusTarget: context.elements.urlInput,
      onClose: expect.any(Function)
    });
  });

  it('closes by delegating to the app modal lifecycle and resetting state', () => {
    const context = createController();
    context.elements.urlInput.value = 'https://github.com/acme/docs';

    expect(context.controller.close()).toBe(true);

    expect(context.closeAppModal).toHaveBeenCalledWith(context.elements.modal);
    expect(context.elements.urlInput.value).toBe('');
  });

  it('tracks selection state and syncs selection controls', () => {
    const context = createController();
    context.controller.reset();

    context.controller.setSelectedPaths(['README.md']);

    expect(Array.from(context.controller.getSelectedPaths())).toEqual(['README.md']);
    expect(context.elements.selectedCount.textContent).toBe('1 selected');
    expect(context.elements.selectAllButton.textContent).toBe('Select All');
  });

  it('submits a direct GitHub file URL and imports the fetched markdown', async () => {
    const client = createClient({
      fetchTextContent: vi.fn(async () => '# README')
    });
    const context = createController({ client });
    context.elements.urlInput.value = 'https://github.com/acme/docs/blob/main/README.md';

    await expect(context.controller.submit()).resolves.toBe('file-imported');

    expect(client.fetchTextContent).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/acme/docs/main/README.md'
    );
    expect(context.importDocument).toHaveBeenCalledWith('# README', 'README');
    expect(context.closeAppModal).toHaveBeenCalledWith(context.elements.modal);
    expect(context.announce).toHaveBeenCalledWith('File imported successfully.');
  });

  it('moves repository imports with multiple markdown files into selection mode', async () => {
    const client = createClient({
      listMarkdownFiles: vi.fn(async () => ['README.md', 'docs/setup.md'])
    });
    const context = createController({ client });
    context.elements.urlInput.value = 'https://github.com/acme/docs';

    await expect(context.controller.submit()).resolves.toBe('select-ready');

    expect(client.getDefaultBranch).toHaveBeenCalledWith('acme', 'docs');
    expect(context.controller.getAvailablePaths()).toEqual(['README.md', 'docs/setup.md']);
    expect(Array.from(context.controller.getSelectedPaths())).toEqual(['README.md']);
    expect(context.elements.urlInput.style.display).toBe('none');
    expect(context.elements.tree.style.display).toBe('block');
    expect(context.elements.submitButton.dataset.step).toBe('select');
    expect(context.elements.submitButton.dataset.owner).toBe('acme');
    expect(context.elements.selectedCount.textContent).toBe('1 selected');
  });

  it('returns null when required submit elements are missing', async () => {
    const elements = createElements();
    elements.submitButton = null as unknown as HTMLButtonElement;
    const context = createController({ elements });

    await expect(context.controller.submit()).resolves.toBeNull();
  });

  it('does not open or close when the modal element is missing', () => {
    const elements = createElements();
    elements.modal = null as unknown as HTMLDivElement;
    const context = createController({ elements });

    expect(context.controller.open()).toBe(false);
    expect(context.controller.close()).toBe(false);
    expect(context.openAppModal).not.toHaveBeenCalled();
    expect(context.closeAppModal).not.toHaveBeenCalled();
  });
});
