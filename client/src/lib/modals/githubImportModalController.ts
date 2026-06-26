import type { AppModalOpenOptions } from './appModalLifecycle';
import type { GitHubImportClient } from './githubImport';
import {
  runGitHubImportSubmit,
  type GitHubImportSubmitResult
} from './githubImportFlow';
import {
  clearGitHubImportTree,
  getGitHubImportSubmitState,
  renderGitHubImportTreeSkeleton,
  resetGitHubImportModalElements,
  setGitHubImportDialogDisabled,
  setGitHubImportLoading,
  setGitHubImportMessage,
  setGitHubImportSelectedPaths,
  showGitHubImportSelectionView,
  syncGitHubImportSelectionUi,
  toggleGitHubImportSelectedPath,
  type GitHubImportMessageOptions
} from './githubImportModal';

export type GitHubImportModalControllerElements = {
  cancelButton?: HTMLButtonElement | null;
  error?: HTMLElement | null;
  fileSelect?: HTMLSelectElement | null;
  modal?: HTMLElement | null;
  selectAllButton?: HTMLButtonElement | null;
  selectedCount?: HTMLElement | null;
  selectionToolbar?: HTMLElement | null;
  submitButton?: HTMLButtonElement | null;
  title?: HTMLElement | null;
  tree?: HTMLElement | null;
  urlInput?: HTMLInputElement | null;
};

export interface GitHubImportModalControllerOptions {
  announce: (message: string) => void;
  client: Pick<GitHubImportClient, 'fetchTextContent' | 'getDefaultBranch' | 'listMarkdownFiles'>;
  closeAppModal: (modal: HTMLElement | null | undefined) => void;
  consoleRef?: Pick<Console, 'error'>;
  elements: GitHubImportModalControllerElements;
  importDocument: (markdown: string, title: string) => void;
  openAppModal: (modal: HTMLElement | null | undefined, options?: AppModalOpenOptions) => void;
}

export interface GitHubImportModalController {
  close: () => boolean;
  getAvailablePaths: () => readonly string[];
  getSelectedPaths: () => ReadonlySet<string>;
  open: () => boolean;
  reset: () => boolean;
  setSelectedPaths: (paths: readonly string[]) => void;
  submit: () => Promise<GitHubImportSubmitResult | null>;
}

export function createGitHubImportModalController(
  options: GitHubImportModalControllerOptions
): GitHubImportModalController {
  const selectedPaths = new Set<string>();
  let availablePaths: string[] = [];
  const { elements } = options;

  const syncSelectionState = () => {
    syncGitHubImportSelectionUi({
      selectAllButton: elements.selectAllButton,
      selectedCount: elements.selectedCount,
      tree: elements.tree
    }, availablePaths, selectedPaths);
  };

  const setSelectedPathsForModal = (paths: readonly string[]) => {
    setGitHubImportSelectedPaths(selectedPaths, paths);
    syncSelectionState();
  };

  const toggleSelectedPath = (path: string) => {
    if (!path) return;
    setSelectedPathsForModal(Array.from(toggleGitHubImportSelectedPath(selectedPaths, path)));
  };

  const setLoading = (isLoading: boolean) => {
    setGitHubImportLoading(elements.submitButton, isLoading);
  };

  const setMessage = (message: string, messageOptions: GitHubImportMessageOptions = {}) => {
    setGitHubImportMessage(elements.error, message, messageOptions);
  };

  const setDialogDisabled = (disabled: boolean) => {
    setGitHubImportDialogDisabled({
      cancelButton: elements.cancelButton,
      selectAllButton: elements.selectAllButton,
      submitButton: elements.submitButton
    }, disabled);
  };

  const reset = (): boolean => {
    const didReset = resetGitHubImportModalElements({
      error: elements.error,
      fileSelect: elements.fileSelect,
      selectionToolbar: elements.selectionToolbar,
      submitButton: elements.submitButton,
      title: elements.title,
      tree: elements.tree,
      urlInput: elements.urlInput
    });
    if (!didReset) return false;

    availablePaths = [];
    setSelectedPathsForModal([]);
    return true;
  };

  const close = (): boolean => {
    if (!elements.modal) return false;
    options.closeAppModal(elements.modal);
    reset();
    return true;
  };

  const open = (): boolean => {
    if (!elements.modal || !elements.urlInput || !elements.submitButton) return false;
    reset();
    options.openAppModal(elements.modal, {
      focusTarget: elements.urlInput,
      onClose: close
    });
    return true;
  };

  const submit = async (): Promise<GitHubImportSubmitResult | null> => {
    if (!elements.submitButton || !elements.urlInput || !elements.fileSelect) return null;

    const submitState = getGitHubImportSubmitState({
      submitButton: elements.submitButton,
      urlInput: elements.urlInput
    }, selectedPaths);
    if (!submitState) return null;

    return runGitHubImportSubmit(
      submitState,
      {
        announce: options.announce,
        client: options.client,
        closeModal: close,
        consoleRef: options.consoleRef,
        importDocument: options.importDocument,
        setDialogDisabled,
        setLoading,
        setMessage,
        showFileSelection(selection) {
          showGitHubImportSelectionView({
            fileSelect: elements.fileSelect,
            selectionToolbar: elements.selectionToolbar,
            submitButton: elements.submitButton,
            title: elements.title,
            tree: elements.tree,
            urlInput: elements.urlInput
          }, selection, toggleSelectedPath);
          availablePaths = selection.files.slice();
          setSelectedPathsForModal(selection.initialSelection);
        },
        showTreeEmpty() {
          clearGitHubImportTree(elements.tree);
        },
        showTreeSkeleton() {
          if (elements.tree) {
            renderGitHubImportTreeSkeleton(elements.tree);
            elements.tree.style.display = 'block';
          }
        }
      }
    );
  };

  return {
    close,
    getAvailablePaths: () => availablePaths,
    getSelectedPaths: () => selectedPaths,
    open,
    reset,
    setSelectedPaths: setSelectedPathsForModal,
    submit
  };
}
