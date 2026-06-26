import { describe, expect, it, vi } from 'vitest';
import {
  runGitHubImportSubmit,
  type GitHubImportSelectionView,
  type GitHubImportSubmitOptions
} from '../../../lib/modals/githubImportFlow';

function createHarness(overrides: Partial<GitHubImportSubmitOptions> = {}) {
  const announce = vi.fn();
  const closeModal = vi.fn();
  const consoleRef = { error: vi.fn() };
  const importDocument = vi.fn();
  const setDialogDisabled = vi.fn();
  const setLoading = vi.fn();
  const setMessage = vi.fn();
  const showFileSelection = vi.fn();
  const showTreeEmpty = vi.fn();
  const showTreeSkeleton = vi.fn();
  const client = {
    fetchTextContent: vi.fn(async () => '# Imported'),
    getDefaultBranch: vi.fn(async () => 'main'),
    listMarkdownFiles: vi.fn(async () => ['README.md', 'docs/setup.md'])
  };

  return {
    options: {
      announce,
      client,
      closeModal,
      consoleRef,
      importDocument,
      setDialogDisabled,
      setLoading,
      setMessage,
      showFileSelection,
      showTreeEmpty,
      showTreeSkeleton,
      ...overrides
    },
    spies: {
      announce,
      client,
      closeModal,
      consoleRef,
      importDocument,
      setDialogDisabled,
      setLoading,
      setMessage,
      showFileSelection,
      showTreeEmpty,
      showTreeSkeleton
    }
  };
}

describe('GitHub import submit flow', () => {
  it('validates missing and unsupported GitHub URLs before loading', async () => {
    const { options, spies } = createHarness();

    await expect(runGitHubImportSubmit({ step: 'url', url: '   ' }, options)).resolves.toBe('validation-error');
    await expect(runGitHubImportSubmit({ step: 'url', url: 'https://example.com/acme/docs' }, options))
      .resolves.toBe('validation-error');

    expect(spies.setMessage).toHaveBeenNthCalledWith(1, 'Please enter a GitHub URL.');
    expect(spies.setMessage).toHaveBeenNthCalledWith(2, 'Please enter a valid GitHub URL.');
    expect(spies.setLoading).not.toHaveBeenCalled();
  });

  it('imports a direct Markdown file URL', async () => {
    const { options, spies } = createHarness();

    await expect(runGitHubImportSubmit({
      step: 'url',
      url: 'https://github.com/acme/docs/blob/main/README.md'
    }, options)).resolves.toBe('file-imported');

    expect(spies.setMessage).toHaveBeenCalledWith('');
    expect(spies.setLoading).toHaveBeenNthCalledWith(1, true);
    expect(spies.setDialogDisabled).toHaveBeenNthCalledWith(1, true);
    expect(spies.announce).toHaveBeenCalledWith('Fetching file from GitHub...');
    expect(spies.client.fetchTextContent).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/acme/docs/main/README.md'
    );
    expect(spies.importDocument).toHaveBeenCalledWith('# Imported', 'README');
    expect(spies.closeModal).toHaveBeenCalledOnce();
    expect(spies.announce).toHaveBeenCalledWith('File imported successfully.');
    expect(spies.setDialogDisabled).toHaveBeenLastCalledWith(false);
    expect(spies.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('rejects direct non-Markdown file URLs through the failure branch', async () => {
    const { options, spies } = createHarness();

    await expect(runGitHubImportSubmit({
      step: 'url',
      url: 'https://github.com/acme/docs/blob/main/logo.png'
    }, options)).resolves.toBe('failed');

    expect(spies.setMessage).toHaveBeenCalledWith(
      'GitHub import failed: The provided URL does not point to a Markdown file.'
    );
    expect(spies.showTreeEmpty).toHaveBeenCalledOnce();
    expect(spies.consoleRef.error).toHaveBeenCalledWith('GitHub import failed:', expect.any(Error));
  });

  it('loads repository files and prepares the selection view', async () => {
    const { options, spies } = createHarness();

    await expect(runGitHubImportSubmit({
      step: 'url',
      url: 'https://github.com/acme/docs'
    }, options)).resolves.toBe('select-ready');

    expect(spies.announce).toHaveBeenCalledWith('Fetching file tree...');
    expect(spies.showTreeSkeleton).toHaveBeenCalledOnce();
    expect(spies.client.getDefaultBranch).toHaveBeenCalledWith('acme', 'docs');
    expect(spies.client.listMarkdownFiles).toHaveBeenCalledWith('acme', 'docs', 'main', '');
    expect(spies.showFileSelection).toHaveBeenCalledWith({
      files: ['README.md', 'docs/setup.md'],
      initialSelection: ['README.md'],
      limitMessage: '',
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      totalCount: 2
    } satisfies GitHubImportSelectionView);
    expect(spies.setMessage).toHaveBeenLastCalledWith('', undefined);
    expect(spies.announce).toHaveBeenCalledWith('GitHub files loaded. 2 files available in the tree.');
  });

  it('handles repository tree URLs, empty results, and single-file fast import', async () => {
    const emptyClient = {
      fetchTextContent: vi.fn(async () => '# Imported'),
      getDefaultBranch: vi.fn(async () => 'main'),
      listMarkdownFiles: vi.fn(async () => [])
    };
    const emptyHarness = createHarness({
      client: emptyClient
    });

    await expect(runGitHubImportSubmit({
      step: 'url',
      url: 'https://github.com/acme/docs/tree/main/guides'
    }, emptyHarness.options)).resolves.toBe('no-files');
    expect(emptyClient.getDefaultBranch).not.toHaveBeenCalled();
    expect(emptyClient.listMarkdownFiles).toHaveBeenCalledWith('acme', 'docs', 'main', 'guides');
    expect(emptyHarness.spies.showTreeEmpty).toHaveBeenCalledOnce();
    expect(emptyHarness.spies.setMessage).toHaveBeenCalledWith('No Markdown files were found at that GitHub location.');

    const singleClient = {
      fetchTextContent: vi.fn(async () => '# Single'),
      getDefaultBranch: vi.fn(async () => 'trunk'),
      listMarkdownFiles: vi.fn(async () => ['docs/only.md'])
    };
    const singleHarness = createHarness({
      client: singleClient
    });

    await expect(runGitHubImportSubmit({
      step: 'url',
      url: 'https://github.com/acme/docs'
    }, singleHarness.options)).resolves.toBe('file-imported');
    expect(singleClient.fetchTextContent).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/acme/docs/trunk/docs/only.md'
    );
    expect(singleHarness.spies.importDocument).toHaveBeenCalledWith('# Single', 'only');
  });

  it('imports selected files and validates empty selections', async () => {
    const { options, spies } = createHarness();

    await expect(runGitHubImportSubmit({
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      selectedPaths: [],
      step: 'select'
    }, options)).resolves.toBe('validation-error');
    expect(spies.setMessage).toHaveBeenCalledWith('Please select at least one file to import.');

    await expect(runGitHubImportSubmit({
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      selectedPaths: ['README.md', 'docs/setup.markdown'],
      step: 'select'
    }, options)).resolves.toBe('files-imported');

    expect(spies.client.fetchTextContent).toHaveBeenNthCalledWith(1, 'https://raw.githubusercontent.com/acme/docs/main/README.md');
    expect(spies.client.fetchTextContent).toHaveBeenNthCalledWith(2, 'https://raw.githubusercontent.com/acme/docs/main/docs/setup.markdown');
    expect(spies.importDocument).toHaveBeenNthCalledWith(1, '# Imported', 'README');
    expect(spies.importDocument).toHaveBeenNthCalledWith(2, '# Imported', 'setup');
    expect(spies.closeModal).toHaveBeenCalledOnce();
    expect(spies.announce).toHaveBeenCalledWith('Files imported successfully.');
  });

  it('reports selected-file import failures and restores controls', async () => {
    const { options, spies } = createHarness({
      client: {
        fetchTextContent: vi.fn(async () => {
          throw new Error('network');
        }),
        getDefaultBranch: vi.fn(async () => 'main'),
        listMarkdownFiles: vi.fn(async () => [])
      }
    });

    await expect(runGitHubImportSubmit({
      owner: 'acme',
      ref: 'main',
      repo: 'docs',
      selectedPaths: ['README.md'],
      step: 'select'
    }, options)).resolves.toBe('failed');

    expect(spies.setMessage).toHaveBeenCalledWith('GitHub import failed: network');
    expect(spies.announce).toHaveBeenCalledWith('GitHub import failed.');
    expect(spies.setDialogDisabled).toHaveBeenLastCalledWith(false);
    expect(spies.setLoading).toHaveBeenLastCalledWith(false);
  });
});
