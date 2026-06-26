import {
  buildRawGitHubUrl,
  getFileName,
  isMarkdownPath,
  parseGitHubImportUrl,
  type GitHubImportClient
} from './githubImport';
import {
  GITHUB_IMPORT_MAX_FILES_SHOWN,
  getGitHubImportLimitMessage,
  getInitialGitHubImportSelection,
  getShownGitHubImportFiles,
  type GitHubImportMessageOptions
} from './githubImportModal';

export type GitHubImportSubmitState =
  | {
      owner?: string;
      ref?: string;
      repo?: string;
      selectedPaths: string[];
      step: 'select';
    }
  | {
      step: 'url';
      url: string;
    };

export type GitHubImportSelectionView = {
  files: string[];
  initialSelection: string[];
  limitMessage: string;
  owner: string;
  ref: string;
  repo: string;
  totalCount: number;
};

export type GitHubImportSubmitResult =
  | 'file-imported'
  | 'files-imported'
  | 'failed'
  | 'no-files'
  | 'select-ready'
  | 'validation-error';

export interface GitHubImportSubmitOptions {
  announce: (message: string) => void;
  client: Pick<GitHubImportClient, 'fetchTextContent' | 'getDefaultBranch' | 'listMarkdownFiles'>;
  closeModal: () => void;
  consoleRef?: Pick<Console, 'error'>;
  importDocument: (markdown: string, title: string) => void;
  maxFilesShown?: number;
  setDialogDisabled: (disabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setMessage: (message: string, options?: GitHubImportMessageOptions) => void;
  showFileSelection: (selection: GitHubImportSelectionView) => void;
  showTreeEmpty: () => void;
  showTreeSkeleton: () => void;
}

export async function runGitHubImportSubmit(
  state: GitHubImportSubmitState,
  options: GitHubImportSubmitOptions
): Promise<GitHubImportSubmitResult> {
  if (state.step === 'select') {
    return importSelectedGitHubFiles(state, options);
  }

  const urlInput = state.url.trim();
  if (!urlInput) {
    options.setMessage('Please enter a GitHub URL.');
    return 'validation-error';
  }

  const parsed = parseGitHubImportUrl(urlInput);
  if (!parsed || !parsed.owner || !parsed.repo) {
    options.setMessage('Please enter a valid GitHub URL.');
    return 'validation-error';
  }

  options.setMessage('');
  options.setLoading(true);
  options.setDialogDisabled(true);

  try {
    if (parsed.type === 'file') {
      if (!isMarkdownPath(parsed.filePath)) {
        throw new Error('The provided URL does not point to a Markdown file.');
      }

      options.announce('Fetching file from GitHub...');
      const markdown = await options.client.fetchTextContent(
        buildRawGitHubUrl(parsed.owner, parsed.repo, parsed.ref, parsed.filePath)
      );
      options.importDocument(markdown, getMarkdownImportTitle(parsed.filePath));
      options.closeModal();
      options.announce('File imported successfully.');
      return 'file-imported';
    }

    options.announce('Fetching file tree...');
    options.showTreeSkeleton();

    const ref = parsed.type === 'tree'
      ? parsed.ref
      : await options.client.getDefaultBranch(parsed.owner, parsed.repo);
    const files = await options.client.listMarkdownFiles(
      parsed.owner,
      parsed.repo,
      ref,
      parsed.type === 'tree' ? parsed.basePath : ''
    );

    if (!files.length) {
      options.showTreeEmpty();
      options.setMessage('No Markdown files were found at that GitHub location.');
      options.announce('Failed to locate Markdown files.');
      return 'no-files';
    }

    if (files.length === 1) {
      const targetPath = files[0];
      options.announce('Fetching file content...');
      const markdown = await options.client.fetchTextContent(
        buildRawGitHubUrl(parsed.owner, parsed.repo, ref, targetPath)
      );
      options.importDocument(markdown, getMarkdownImportTitle(targetPath));
      options.closeModal();
      options.announce('File imported successfully.');
      return 'file-imported';
    }

    const maxFilesShown = options.maxFilesShown ?? GITHUB_IMPORT_MAX_FILES_SHOWN;
    const shownFiles = getShownGitHubImportFiles(files, maxFilesShown);
    const limitMessage = getGitHubImportLimitMessage(files.length, maxFilesShown);
    options.showFileSelection({
      files: shownFiles,
      initialSelection: getInitialGitHubImportSelection(shownFiles),
      limitMessage,
      owner: parsed.owner,
      ref,
      repo: parsed.repo,
      totalCount: files.length
    });
    options.announce(`GitHub files loaded. ${files.length} files available in the tree.`);
    options.setMessage(limitMessage, limitMessage ? { isError: false } : undefined);
    return 'select-ready';
  } catch (error) {
    options.consoleRef?.error('GitHub import failed:', error);
    options.setMessage(`GitHub import failed: ${getErrorMessage(error)}`);
    options.announce('GitHub import failed.');
    options.showTreeEmpty();
    return 'failed';
  } finally {
    options.setDialogDisabled(false);
    options.setLoading(false);
  }
}

async function importSelectedGitHubFiles(
  state: Extract<GitHubImportSubmitState, { step: 'select' }>,
  options: GitHubImportSubmitOptions
): Promise<GitHubImportSubmitResult> {
  if (!state.owner || !state.repo || !state.ref || !state.selectedPaths.length) {
    options.setMessage('Please select at least one file to import.');
    return 'validation-error';
  }

  options.setLoading(true);
  options.setDialogDisabled(true);
  options.announce('Importing selected files from GitHub...');

  try {
    for (const selectedPath of state.selectedPaths) {
      const markdown = await options.client.fetchTextContent(
        buildRawGitHubUrl(state.owner, state.repo, state.ref, selectedPath)
      );
      options.importDocument(markdown, getMarkdownImportTitle(selectedPath));
    }
    options.closeModal();
    options.announce('Files imported successfully.');
    return 'files-imported';
  } catch (error) {
    options.consoleRef?.error('GitHub import failed:', error);
    options.setMessage(`GitHub import failed: ${getErrorMessage(error)}`);
    options.announce('GitHub import failed.');
    return 'failed';
  } finally {
    options.setDialogDisabled(false);
    options.setLoading(false);
  }
}

function getMarkdownImportTitle(path: string): string {
  return getFileName(path).replace(/\.(md|markdown)$/i, '');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
