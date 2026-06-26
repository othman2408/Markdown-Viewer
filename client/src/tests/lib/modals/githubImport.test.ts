import { describe, expect, it } from 'vitest';
import {
  buildMarkdownFileTree,
  buildRawGitHubUrl,
  createGitHubImportClient,
  getFileName,
  isMarkdownPath,
  parseGitHubImportUrl
} from '../../../lib/modals/githubImport';

describe('GitHub import helpers', () => {
  it('detects markdown paths case-insensitively', () => {
    expect(isMarkdownPath('README.md')).toBe(true);
    expect(isMarkdownPath('docs/Guide.MARKDOWN')).toBe(true);
    expect(isMarkdownPath('docs/guide.txt')).toBe(false);
    expect(isMarkdownPath('')).toBe(false);
    expect(isMarkdownPath(null)).toBe(false);
  });

  it('extracts file names with the filename fallback', () => {
    expect(getFileName('docs/setup.md')).toBe('setup.md');
    expect(getFileName('README.md')).toBe('README.md');
    expect(getFileName('')).toBe('document.md');
    expect(getFileName(null)).toBe('document.md');
  });

  it('builds encoded raw GitHub file URLs', () => {
    expect(buildRawGitHubUrl('owner name', 'repo/name', 'feature branch', 'docs/a file.md')).toBe(
      'https://raw.githubusercontent.com/owner%20name/repo%2Fname/feature%20branch/docs/a%20file.md'
    );
  });

  it('parses repository, file, tree, and raw GitHub URLs', () => {
    expect(parseGitHubImportUrl('https://github.com/acme/docs')).toEqual({
      owner: 'acme',
      repo: 'docs',
      type: 'repo'
    });

    expect(parseGitHubImportUrl('https://www.github.com/acme/docs.git/blob/main/README.md')).toEqual({
      owner: 'acme',
      repo: 'docs',
      type: 'file',
      ref: 'main',
      filePath: 'README.md'
    });

    expect(parseGitHubImportUrl('https://github.com/acme/docs/tree/main/guides/install')).toEqual({
      owner: 'acme',
      repo: 'docs',
      type: 'tree',
      ref: 'main',
      basePath: 'guides/install'
    });

    expect(parseGitHubImportUrl('https://raw.githubusercontent.com/acme/docs/main/guides/setup.md')).toEqual({
      owner: 'acme',
      repo: 'docs',
      type: 'file',
      ref: 'main',
      filePath: 'guides/setup.md'
    });
  });

  it('rejects unsupported GitHub import URLs', () => {
    expect(parseGitHubImportUrl('not a url')).toBeNull();
    expect(parseGitHubImportUrl('https://example.com/acme/docs')).toBeNull();
    expect(parseGitHubImportUrl('https://raw.githubusercontent.com/acme/docs/main')).toBeNull();
  });

  it('builds a nested markdown file tree', () => {
    expect(buildMarkdownFileTree([
      'README.md',
      'docs/setup.md',
      'docs/api/reference.markdown',
      '',
      null
    ])).toEqual({
      folders: {
        docs: {
          folders: {
            api: {
              folders: {},
              files: [{ name: 'reference.markdown', path: 'docs/api/reference.markdown' }]
            }
          },
          files: [{ name: 'setup.md', path: 'docs/setup.md' }]
        }
      },
      files: [{ name: 'README.md', path: 'README.md' }]
    });
  });

  it('fetches the default branch through the GitHub API client', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createGitHubImportClient({
      minRequestIntervalMs: 0,
      fetchRef: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          json: async () => ({ default_branch: 'trunk' }),
          text: async () => ''
        };
      }
    });

    await expect(client.getDefaultBranch('acme', 'docs')).resolves.toBe('trunk');
    expect(calls[0].url).toBe('https://api.github.com/repos/acme/docs');
    expect((calls[0].init?.headers as Record<string, string>).Accept).toBe('application/vnd.github+json');
  });

  it('filters recursive GitHub trees to markdown files under the selected base path', async () => {
    const client = createGitHubImportClient({
      minRequestIntervalMs: 0,
      fetchRef: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          tree: [
            { type: 'blob', path: 'README.md' },
            { type: 'blob', path: 'docs/setup.md' },
            { type: 'blob', path: 'docs/api/reference.MARKDOWN' },
            { type: 'tree', path: 'docs' },
            { type: 'blob', path: 'docs/image.png' }
          ]
        }),
        text: async () => ''
      })
    });

    await expect(client.listMarkdownFiles('acme', 'docs', 'main', '/docs/')).resolves.toEqual([
      'docs/api/reference.MARKDOWN',
      'docs/setup.md'
    ]);
  });

  it('throws clear errors for failed GitHub text fetches', async () => {
    const client = createGitHubImportClient({
      minRequestIntervalMs: 0,
      fetchRef: async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => ''
      })
    });

    await expect(client.fetchTextContent('https://raw.githubusercontent.com/acme/docs/main/README.md'))
      .rejects.toThrow('Failed to fetch file (404)');
  });
});
