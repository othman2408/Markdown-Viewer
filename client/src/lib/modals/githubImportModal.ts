import {
  buildMarkdownFileTree,
  type MarkdownFileTree
} from './githubImport';
import type {
  GitHubImportSelectionView,
  GitHubImportSubmitState
} from './githubImportFlow';

export const GITHUB_IMPORT_MAX_FILES_SHOWN = 30;

export type GitHubImportMessageOptions = {
  isError?: boolean;
};

export type GitHubImportDialogDisabledElements = {
  cancelButton?: HTMLButtonElement | null;
  selectAllButton?: HTMLButtonElement | null;
  submitButton?: HTMLButtonElement | null;
};

export type GitHubImportResetElements = {
  error?: HTMLElement | null;
  fileSelect?: HTMLSelectElement | null;
  selectionToolbar?: HTMLElement | null;
  submitButton?: HTMLButtonElement | null;
  title?: HTMLElement | null;
  tree?: HTMLElement | null;
  urlInput?: HTMLInputElement | null;
};

export type GitHubImportSelectionSyncElements = {
  selectAllButton?: HTMLButtonElement | null;
  selectedCount?: HTMLElement | null;
  tree?: HTMLElement | null;
};

export type GitHubImportSelectionViewElements = {
  fileSelect?: HTMLSelectElement | null;
  selectionToolbar?: HTMLElement | null;
  submitButton?: HTMLButtonElement | null;
  title?: HTMLElement | null;
  tree?: HTMLElement | null;
  urlInput?: HTMLInputElement | null;
};

export type GitHubImportSubmitStateElements = {
  submitButton?: HTMLButtonElement | null;
  urlInput?: HTMLInputElement | null;
};

export type GitHubImportModalControlElements = {
  cancelButton?: HTMLButtonElement | null;
  fileSelect?: HTMLSelectElement | null;
  selectAllButton?: HTMLButtonElement | null;
  submitButton?: HTMLButtonElement | null;
  urlInput?: HTMLInputElement | null;
};

export type GitHubImportModalControlHandlers = {
  closeModal: () => void;
  getAvailablePaths: () => readonly string[];
  getSelectedPaths: () => ReadonlySet<string>;
  setSelectedPaths: (paths: readonly string[]) => void;
  submitImport: () => void | Promise<void>;
};

export type GitHubImportModalControlsAttachment = {
  detach(): void;
};

export function getGitHubImportSelectedCountLabel(count: number): string {
  return `${Math.max(0, count)} selected`;
}

export function getGitHubImportSelectAllLabel(totalCount: number, selectedCount: number): string {
  return totalCount > 0 && selectedCount === totalCount ? 'Clear All' : 'Select All';
}

export function toggleGitHubImportSelectedPath(
  selectedPaths: ReadonlySet<string>,
  path: string | null | undefined
): Set<string> {
  const nextSelectedPaths = new Set(selectedPaths);
  if (!path) return nextSelectedPaths;

  if (nextSelectedPaths.has(path)) {
    nextSelectedPaths.delete(path);
  } else {
    nextSelectedPaths.add(path);
  }

  return nextSelectedPaths;
}

export function getInitialGitHubImportSelection(paths: readonly string[]): string[] {
  return paths[0] ? [paths[0]] : [];
}

export function getShownGitHubImportFiles(
  paths: readonly string[],
  maxFiles = GITHUB_IMPORT_MAX_FILES_SHOWN
): string[] {
  return paths.slice(0, maxFiles);
}

export function getGitHubImportLimitMessage(
  totalCount: number,
  maxFiles = GITHUB_IMPORT_MAX_FILES_SHOWN
): string {
  return totalCount > maxFiles
    ? `Showing first ${maxFiles} of ${totalCount} Markdown files.`
    : '';
}

export function setGitHubImportSelectedPaths(
  selectedPaths: Set<string>,
  paths: readonly string[] | null | undefined
): void {
  selectedPaths.clear();
  (paths || []).forEach((path) => selectedPaths.add(path));
}

export function getGitHubImportSelectAllSelection(
  availablePaths: readonly string[],
  selectedPaths: ReadonlySet<string>
): string[] {
  return selectedPaths.size === availablePaths.length ? [] : [...availablePaths];
}

export function attachGitHubImportModalControls(
  elements: GitHubImportModalControlElements,
  handlers: GitHubImportModalControlHandlers
): GitHubImportModalControlsAttachment {
  const handleSubmitClick = () => {
    void handlers.submitImport();
  };
  const handleCancelClick = () => {
    handlers.closeModal();
  };
  const handleInputKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handlers.submitImport();
      return;
    }

    if (event.key === 'Escape') {
      handlers.closeModal();
    }
  };
  const handleSelectAllClick = () => {
    handlers.setSelectedPaths(getGitHubImportSelectAllSelection(
      handlers.getAvailablePaths(),
      handlers.getSelectedPaths()
    ));
  };

  elements.submitButton?.addEventListener('click', handleSubmitClick);
  elements.cancelButton?.addEventListener('click', handleCancelClick);
  elements.urlInput?.addEventListener('keydown', handleInputKeydown);
  elements.fileSelect?.addEventListener('keydown', handleInputKeydown);
  elements.selectAllButton?.addEventListener('click', handleSelectAllClick);

  return {
    detach() {
      elements.submitButton?.removeEventListener('click', handleSubmitClick);
      elements.cancelButton?.removeEventListener('click', handleCancelClick);
      elements.urlInput?.removeEventListener('keydown', handleInputKeydown);
      elements.fileSelect?.removeEventListener('keydown', handleInputKeydown);
      elements.selectAllButton?.removeEventListener('click', handleSelectAllClick);
    }
  };
}

export function setGitHubImportLoading(button: HTMLButtonElement | null | undefined, isLoading: boolean): void {
  if (!button) return;

  if (isLoading) {
    button.dataset.loadingText = button.textContent || '';
    button.textContent = 'Importing...';
    return;
  }

  if (button.dataset.loadingText) {
    button.textContent = button.dataset.loadingText;
    delete button.dataset.loadingText;
  }
}

export function setGitHubImportMessage(
  element: HTMLElement | null | undefined,
  message: string,
  options: GitHubImportMessageOptions = {}
): void {
  if (!element) return;

  const { isError = true } = options;
  element.classList.toggle('is-info', !isError);
  if (!message) {
    element.textContent = '';
    element.style.display = 'none';
    return;
  }

  element.textContent = message;
  element.style.display = 'block';
}

export function setGitHubImportDialogDisabled(
  elements: GitHubImportDialogDisabledElements,
  disabled: boolean
): void {
  if (elements.submitButton) elements.submitButton.disabled = disabled;
  if (elements.cancelButton) elements.cancelButton.disabled = disabled;
  if (elements.selectAllButton) elements.selectAllButton.disabled = disabled;
}

export function resetGitHubImportModalElements(elements: GitHubImportResetElements): boolean {
  const { fileSelect, submitButton, urlInput } = elements;
  if (!urlInput || !fileSelect || !submitButton) return false;

  if (elements.title) {
    elements.title.textContent = 'Import Markdown from GitHub';
  }

  urlInput.value = '';
  urlInput.style.display = 'block';
  urlInput.disabled = false;

  fileSelect.innerHTML = '';
  fileSelect.style.display = 'none';
  fileSelect.disabled = false;

  if (elements.selectionToolbar) {
    elements.selectionToolbar.style.display = 'none';
  }

  if (elements.tree) {
    elements.tree.innerHTML = '';
    elements.tree.style.display = 'none';
  }

  submitButton.dataset.step = 'url';
  delete submitButton.dataset.owner;
  delete submitButton.dataset.repo;
  delete submitButton.dataset.ref;
  submitButton.textContent = 'Import';

  setGitHubImportMessage(elements.error, '');
  return true;
}

export function getGitHubImportSubmitState(
  elements: GitHubImportSubmitStateElements,
  selectedPaths: ReadonlySet<string>
): GitHubImportSubmitState | null {
  const { submitButton, urlInput } = elements;
  if (!submitButton || !urlInput) return null;

  const step = submitButton.dataset.step || 'url';
  if (step === 'select') {
    return {
      owner: submitButton.dataset.owner,
      ref: submitButton.dataset.ref,
      repo: submitButton.dataset.repo,
      selectedPaths: Array.from(selectedPaths),
      step: 'select'
    };
  }

  return {
    step: 'url',
    url: urlInput.value
  };
}

export function syncGitHubImportSelectionUi(
  elements: GitHubImportSelectionSyncElements,
  availablePaths: readonly string[],
  selectedPaths: ReadonlySet<string>
): void {
  if (elements.selectedCount) {
    elements.selectedCount.textContent = getGitHubImportSelectedCountLabel(selectedPaths.size);
  }
  if (elements.selectAllButton) {
    elements.selectAllButton.textContent = getGitHubImportSelectAllLabel(
      availablePaths.length,
      selectedPaths.size
    );
  }
  syncGitHubImportTreeSelection(elements.tree, selectedPaths);
}

export function syncGitHubImportTreeSelection(
  tree: ParentNode | null | undefined,
  selectedPaths: ReadonlySet<string>
): void {
  if (!tree) return;

  Array.from(tree.querySelectorAll<HTMLButtonElement>('.github-tree-file-btn')).forEach((button) => {
    const isSelected = selectedPaths.has(button.dataset.path || '');
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

export function renderGitHubImportTree(
  treeElement: HTMLElement | null | undefined,
  paths: readonly string[],
  onTogglePath: (path: string) => void
): void {
  if (!treeElement) return;

  treeElement.innerHTML = '';
  const tree = buildMarkdownFileTree([...paths]);
  treeElement.appendChild(createGitHubImportTreeBranch(
    treeElement.ownerDocument,
    tree,
    '',
    onTogglePath
  ));
}

export function showGitHubImportSelectionView(
  elements: GitHubImportSelectionViewElements,
  selection: GitHubImportSelectionView,
  onTogglePath: (path: string) => void
): boolean {
  const { fileSelect, submitButton, urlInput } = elements;
  if (!fileSelect || !submitButton || !urlInput) return false;

  fileSelect.innerHTML = '';
  urlInput.style.display = 'none';
  fileSelect.style.display = 'none';
  if (elements.selectionToolbar) {
    elements.selectionToolbar.style.display = 'flex';
  }
  if (elements.tree) {
    elements.tree.style.display = 'block';
  }

  selection.files.forEach((filePath) => {
    const option = fileSelect.ownerDocument.createElement('option');
    option.value = filePath;
    option.textContent = filePath;
    fileSelect.appendChild(option);
  });

  renderGitHubImportTree(elements.tree, selection.files, onTogglePath);

  if (elements.title) {
    elements.title.textContent = 'Select Markdown file(s) to import';
  }

  submitButton.dataset.step = 'select';
  submitButton.dataset.owner = selection.owner;
  submitButton.dataset.repo = selection.repo;
  submitButton.dataset.ref = selection.ref;
  submitButton.textContent = 'Import Selected';
  return true;
}

export function clearGitHubImportTree(treeElement: HTMLElement | null | undefined): void {
  if (!treeElement) return;
  treeElement.innerHTML = '';
  treeElement.style.display = 'none';
}

export function renderGitHubImportTreeSkeleton(treeElement: HTMLElement | null | undefined): void {
  if (!treeElement) return;

  treeElement.textContent = '';
  const doc = treeElement.ownerDocument;
  const wrapper = doc.createElement('div');
  wrapper.className = 'github-import-tree-skeleton';

  const list = doc.createElement('ul');
  list.style.listStyle = 'none';
  list.style.paddingLeft = '4px';
  list.style.margin = '0';

  for (let i = 0; i < 4; i += 1) {
    const folderItem = doc.createElement('li');
    folderItem.style.margin = '6px 0';

    const folderSpan = doc.createElement('span');
    folderSpan.className = 'skeleton-placeholder skeleton-tree-folder';
    folderItem.appendChild(folderSpan);

    const subList = doc.createElement('ul');
    subList.style.listStyle = 'none';
    subList.style.paddingLeft = '18px';
    subList.style.margin = '0';

    for (let j = 0; j < 2; j += 1) {
      const fileItem = doc.createElement('li');
      fileItem.style.margin = '4px 0';

      const fileSpan = doc.createElement('span');
      fileSpan.className = 'skeleton-placeholder skeleton-tree-file';
      fileItem.appendChild(fileSpan);
      subList.appendChild(fileItem);
    }

    folderItem.appendChild(subList);
    list.appendChild(folderItem);
  }

  wrapper.appendChild(list);
  treeElement.appendChild(wrapper);
}

function createGitHubImportTreeBranch(
  doc: Document,
  node: MarkdownFileTree,
  parentPath: string,
  onTogglePath: (path: string) => void
): HTMLUListElement {
  const list = doc.createElement('ul');
  const folderNames = Object.keys(node.folders).sort((a, b) => a.localeCompare(b));

  folderNames.forEach((folderName) => {
    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const item = doc.createElement('li');
    const folderLabel = doc.createElement('span');
    folderLabel.className = 'github-tree-folder-label';
    folderLabel.textContent = `\u{1F4C1} ${folderName}`;
    item.appendChild(folderLabel);
    item.appendChild(createGitHubImportTreeBranch(
      doc,
      node.folders[folderName],
      folderPath,
      onTogglePath
    ));
    list.appendChild(item);
  });

  node.files
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach((file) => {
      const fileItem = doc.createElement('li');
      const fileButton = doc.createElement('button');
      fileButton.type = 'button';
      fileButton.className = 'github-tree-file-btn';
      fileButton.dataset.path = file.path;
      fileButton.setAttribute('aria-pressed', 'false');
      fileButton.textContent = `\u{1F4C4} ${file.name}`;
      fileButton.addEventListener('click', () => {
        onTogglePath(file.path);
      });
      fileItem.appendChild(fileButton);
      list.appendChild(fileItem);
    });

  return list;
}
