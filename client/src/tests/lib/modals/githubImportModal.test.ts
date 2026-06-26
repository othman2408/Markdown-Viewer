// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  attachGitHubImportModalControls,
  clearGitHubImportTree,
  GITHUB_IMPORT_MAX_FILES_SHOWN,
  getGitHubImportLimitMessage,
  getGitHubImportSelectAllSelection,
  getGitHubImportSelectedCountLabel,
  getGitHubImportSelectAllLabel,
  getInitialGitHubImportSelection,
  getGitHubImportSubmitState,
  getShownGitHubImportFiles,
  renderGitHubImportTree,
  renderGitHubImportTreeSkeleton,
  resetGitHubImportModalElements,
  setGitHubImportSelectedPaths,
  setGitHubImportDialogDisabled,
  setGitHubImportLoading,
  setGitHubImportMessage,
  showGitHubImportSelectionView,
  syncGitHubImportSelectionUi,
  syncGitHubImportTreeSelection,
  toggleGitHubImportSelectedPath
} from '../../../lib/modals/githubImportModal';

describe('GitHub import modal helpers', () => {
  it('formats selection count and select-all labels', () => {
    expect(getGitHubImportSelectedCountLabel(2)).toBe('2 selected');
    expect(getGitHubImportSelectedCountLabel(-1)).toBe('0 selected');
    expect(getGitHubImportSelectAllLabel(3, 3)).toBe('Clear All');
    expect(getGitHubImportSelectAllLabel(3, 2)).toBe('Select All');
    expect(getGitHubImportSelectAllLabel(0, 0)).toBe('Select All');
  });

  it('toggles selected paths without mutating the previous set', () => {
    const selected = new Set(['README.md']);

    expect(Array.from(toggleGitHubImportSelectedPath(selected, 'docs/setup.md')).sort()).toEqual([
      'README.md',
      'docs/setup.md'
    ]);
    expect(Array.from(toggleGitHubImportSelectedPath(selected, 'README.md'))).toEqual([]);
    expect(Array.from(selected)).toEqual(['README.md']);
    expect(Array.from(toggleGitHubImportSelectedPath(selected, ''))).toEqual(['README.md']);
  });

  it('prepares shown file limits and initial selection', () => {
    const paths = Array.from({ length: GITHUB_IMPORT_MAX_FILES_SHOWN + 2 }, (_, index) => `doc-${index}.md`);

    expect(getShownGitHubImportFiles(paths)).toHaveLength(GITHUB_IMPORT_MAX_FILES_SHOWN);
    expect(getInitialGitHubImportSelection(['README.md', 'docs/setup.md'])).toEqual(['README.md']);
    expect(getInitialGitHubImportSelection([])).toEqual([]);
    expect(getGitHubImportLimitMessage(paths.length)).toBe('Showing first 30 of 32 Markdown files.');
    expect(getGitHubImportLimitMessage(2)).toBe('');
  });

  it('mutates selected path sets and computes select-all target selections', () => {
    const selected = new Set(['old.md']);

    setGitHubImportSelectedPaths(selected, ['README.md', 'docs/setup.md']);
    expect(Array.from(selected)).toEqual(['README.md', 'docs/setup.md']);
    expect(getGitHubImportSelectAllSelection(['README.md', 'docs/setup.md'], selected)).toEqual([]);
    expect(getGitHubImportSelectAllSelection(['README.md', 'docs/setup.md', 'extra.md'], selected)).toEqual([
      'README.md',
      'docs/setup.md',
      'extra.md'
    ]);
  });

  it('attaches GitHub import modal control listeners', () => {
    const submitButton = document.createElement('button');
    const cancelButton = document.createElement('button');
    const urlInput = document.createElement('input');
    const fileSelect = document.createElement('select');
    const selectAllButton = document.createElement('button');
    const selected = new Set(['README.md']);
    const submitImport = vi.fn<() => void>();
    const closeModal = vi.fn<() => void>();
    const setSelectedPaths = vi.fn<(paths: readonly string[]) => void>();

    attachGitHubImportModalControls({
      cancelButton,
      fileSelect,
      selectAllButton,
      submitButton,
      urlInput
    }, {
      closeModal,
      getAvailablePaths: () => ['README.md', 'docs/setup.md'],
      getSelectedPaths: () => selected,
      setSelectedPaths,
      submitImport
    });

    submitButton.click();
    cancelButton.click();
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter'
    });
    urlInput.dispatchEvent(enterEvent);
    fileSelect.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    selectAllButton.click();

    expect(submitImport).toHaveBeenCalledTimes(2);
    expect(closeModal).toHaveBeenCalledTimes(2);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(setSelectedPaths).toHaveBeenCalledWith(['README.md', 'docs/setup.md']);
  });

  it('supports missing GitHub import modal controls and detaches listeners', () => {
    const submitButton = document.createElement('button');
    const urlInput = document.createElement('input');
    const submitImport = vi.fn<() => void>();
    const closeModal = vi.fn<() => void>();
    const setSelectedPaths = vi.fn<(paths: readonly string[]) => void>();

    const attachment = attachGitHubImportModalControls({
      submitButton,
      urlInput
    }, {
      closeModal,
      getAvailablePaths: () => [],
      getSelectedPaths: () => new Set(),
      setSelectedPaths,
      submitImport
    });

    attachment.detach();
    submitButton.click();
    urlInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter'
    }));

    expect(submitImport).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
    expect(setSelectedPaths).not.toHaveBeenCalled();
  });

  it('updates GitHub import loading and message elements', () => {
    const submitButton = document.createElement('button');
    const message = document.createElement('p');
    submitButton.textContent = 'Import Selected';

    setGitHubImportLoading(submitButton, true);
    expect(submitButton.textContent).toBe('Importing...');
    expect(submitButton.dataset.loadingText).toBe('Import Selected');

    setGitHubImportLoading(submitButton, false);
    expect(submitButton.textContent).toBe('Import Selected');
    expect(submitButton.dataset.loadingText).toBeUndefined();

    setGitHubImportMessage(message, 'No files found.', { isError: false });
    expect(message.textContent).toBe('No files found.');
    expect(message.style.display).toBe('block');
    expect(message.classList.contains('is-info')).toBe(true);

    setGitHubImportMessage(message, '');
    expect(message.textContent).toBe('');
    expect(message.style.display).toBe('none');
    expect(message.classList.contains('is-info')).toBe(false);
  });

  it('applies dialog disabled state to available controls', () => {
    const submitButton = document.createElement('button');
    const cancelButton = document.createElement('button');
    const selectAllButton = document.createElement('button');

    setGitHubImportDialogDisabled({ cancelButton, selectAllButton, submitButton }, true);
    expect(submitButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
    expect(selectAllButton.disabled).toBe(true);

    setGitHubImportDialogDisabled({ cancelButton, selectAllButton, submitButton }, false);
    expect(submitButton.disabled).toBe(false);
    expect(cancelButton.disabled).toBe(false);
    expect(selectAllButton.disabled).toBe(false);
  });

  it('resets GitHub import modal DOM fields to the URL step', () => {
    const title = document.createElement('p');
    const urlInput = document.createElement('input');
    const fileSelect = document.createElement('select');
    const selectionToolbar = document.createElement('div');
    const tree = document.createElement('div');
    const error = document.createElement('p');
    const submitButton = document.createElement('button');

    title.textContent = 'Select Markdown file(s) to import';
    urlInput.value = 'https://github.com/acme/docs';
    urlInput.style.display = 'none';
    urlInput.disabled = true;
    fileSelect.innerHTML = '<option>README.md</option>';
    fileSelect.style.display = 'block';
    fileSelect.disabled = true;
    selectionToolbar.style.display = 'flex';
    tree.innerHTML = '<button>README.md</button>';
    tree.style.display = 'block';
    error.textContent = 'Error';
    error.style.display = 'block';
    submitButton.dataset.step = 'select';
    submitButton.dataset.owner = 'acme';
    submitButton.dataset.repo = 'docs';
    submitButton.dataset.ref = 'main';
    submitButton.textContent = 'Import Selected';

    expect(resetGitHubImportModalElements({
      error,
      fileSelect,
      selectionToolbar,
      submitButton,
      title,
      tree,
      urlInput
    })).toBe(true);

    expect(title.textContent).toBe('Import Markdown from GitHub');
    expect(urlInput.value).toBe('');
    expect(urlInput.style.display).toBe('block');
    expect(urlInput.disabled).toBe(false);
    expect(fileSelect.innerHTML).toBe('');
    expect(fileSelect.style.display).toBe('none');
    expect(fileSelect.disabled).toBe(false);
    expect(selectionToolbar.style.display).toBe('none');
    expect(tree.innerHTML).toBe('');
    expect(tree.style.display).toBe('none');
    expect(error.textContent).toBe('');
    expect(error.style.display).toBe('none');
    expect(submitButton.dataset.step).toBe('url');
    expect(submitButton.dataset.owner).toBeUndefined();
    expect(submitButton.dataset.repo).toBeUndefined();
    expect(submitButton.dataset.ref).toBeUndefined();
    expect(submitButton.textContent).toBe('Import');
  });

  it('extracts GitHub import submit state from URL and selection steps', () => {
    const submitButton = document.createElement('button');
    const urlInput = document.createElement('input');
    urlInput.value = 'https://github.com/acme/docs';

    expect(getGitHubImportSubmitState({ submitButton, urlInput }, new Set())).toEqual({
      step: 'url',
      url: 'https://github.com/acme/docs'
    });

    submitButton.dataset.step = 'select';
    submitButton.dataset.owner = 'acme';
    submitButton.dataset.repo = 'docs';
    submitButton.dataset.ref = 'main';
    expect(getGitHubImportSubmitState({ submitButton, urlInput }, new Set(['README.md']))).toEqual({
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      selectedPaths: ['README.md'],
      step: 'select'
    });
    expect(getGitHubImportSubmitState({ submitButton: null, urlInput }, new Set())).toBeNull();
  });

  it('renders a nested GitHub import tree and dispatches file toggles', () => {
    const tree = document.createElement('div');
    const onTogglePath = vi.fn();

    renderGitHubImportTree(tree, ['docs/setup.md', 'README.md'], onTogglePath);
    const buttons = Array.from(tree.querySelectorAll<HTMLButtonElement>('.github-tree-file-btn'));

    expect(tree.querySelector('.github-tree-folder-label')?.textContent).toBe('\u{1F4C1} docs');
    expect(buttons.map((button) => button.dataset.path)).toEqual(['docs/setup.md', 'README.md']);
    expect(buttons.map((button) => button.textContent)).toEqual([
      '\u{1F4C4} setup.md',
      '\u{1F4C4} README.md'
    ]);

    buttons[0].click();
    expect(onTogglePath).toHaveBeenCalledWith('docs/setup.md');
  });

  it('syncs selected state onto rendered file buttons', () => {
    const tree = document.createElement('div');

    renderGitHubImportTree(tree, ['README.md', 'docs/setup.md'], () => {});
    syncGitHubImportTreeSelection(tree, new Set(['docs/setup.md']));

    const buttons = Array.from(tree.querySelectorAll<HTMLButtonElement>('.github-tree-file-btn'));
    expect(buttons[0].classList.contains('is-selected')).toBe(true);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].classList.contains('is-selected')).toBe(false);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('syncs selected count, select-all label, and tree selection together', () => {
    const tree = document.createElement('div');
    const selectedCount = document.createElement('span');
    const selectAllButton = document.createElement('button');

    renderGitHubImportTree(tree, ['README.md', 'docs/setup.md'], () => {});
    syncGitHubImportSelectionUi({
      selectAllButton,
      selectedCount,
      tree
    }, ['README.md', 'docs/setup.md'], new Set(['README.md']));

    expect(selectedCount.textContent).toBe('1 selected');
    expect(selectAllButton.textContent).toBe('Select All');
    expect(tree.querySelector<HTMLButtonElement>('[data-path="README.md"]')?.classList.contains('is-selected')).toBe(true);

    syncGitHubImportSelectionUi({
      selectAllButton,
      selectedCount,
      tree
    }, ['README.md', 'docs/setup.md'], new Set(['README.md', 'docs/setup.md']));
    expect(selectedCount.textContent).toBe('2 selected');
    expect(selectAllButton.textContent).toBe('Clear All');
  });

  it('shows the GitHub import selection view DOM state', () => {
    const title = document.createElement('p');
    const urlInput = document.createElement('input');
    const fileSelect = document.createElement('select');
    const selectionToolbar = document.createElement('div');
    const tree = document.createElement('div');
    const submitButton = document.createElement('button');
    const onTogglePath = vi.fn();

    expect(showGitHubImportSelectionView({
      fileSelect,
      selectionToolbar,
      submitButton,
      title,
      tree,
      urlInput
    }, {
      files: ['README.md', 'docs/setup.md'],
      initialSelection: ['README.md'],
      limitMessage: '',
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      totalCount: 2
    }, onTogglePath)).toBe(true);

    expect(urlInput.style.display).toBe('none');
    expect(fileSelect.style.display).toBe('none');
    expect(selectionToolbar.style.display).toBe('flex');
    expect(tree.style.display).toBe('block');
    expect(Array.from(fileSelect.options).map((option) => option.value)).toEqual(['README.md', 'docs/setup.md']);
    expect(title.textContent).toBe('Select Markdown file(s) to import');
    expect(submitButton.dataset.step).toBe('select');
    expect(submitButton.dataset.owner).toBe('acme');
    expect(submitButton.dataset.repo).toBe('docs');
    expect(submitButton.dataset.ref).toBe('main');
    expect(submitButton.textContent).toBe('Import Selected');

    tree.querySelector<HTMLButtonElement>('[data-path="README.md"]')?.click();
    expect(onTogglePath).toHaveBeenCalledWith('README.md');
    expect(showGitHubImportSelectionView({ fileSelect: null, submitButton, urlInput }, {
      files: [],
      initialSelection: [],
      limitMessage: '',
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      totalCount: 0
    }, onTogglePath)).toBe(false);
  });

  it('renders the GitHub tree skeleton contract', () => {
    const tree = document.createElement('div');

    renderGitHubImportTreeSkeleton(tree);

    expect(tree.querySelector('.github-import-tree-skeleton')).not.toBeNull();
    expect(tree.querySelectorAll('.skeleton-tree-folder')).toHaveLength(4);
    expect(tree.querySelectorAll('.skeleton-tree-file')).toHaveLength(8);

    clearGitHubImportTree(tree);
    expect(tree.innerHTML).toBe('');
    expect(tree.style.display).toBe('none');
  });
});
