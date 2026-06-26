export type GitHubImportTarget =
  | {
      owner: string;
      repo: string;
      type: 'repo';
    }
  | {
      owner: string;
      repo: string;
      type: 'file';
      ref: string;
      filePath: string;
    }
  | {
      owner: string;
      repo: string;
      type: 'tree';
      ref: string;
      basePath: string;
    };

export type MarkdownFileTree = {
  folders: Record<string, MarkdownFileTree>;
  files: Array<{
    name: string;
    path: string;
  }>;
};

export const DEFAULT_GITHUB_IMPORT_MIN_REQUEST_INTERVAL_MS = 800;

type GitHubFetchResponse = Pick<Response, 'json' | 'ok' | 'status' | 'text'>;
type GitHubFetch = (url: string, init?: RequestInit) => Promise<GitHubFetchResponse>;

export interface GitHubImportClientOptions {
  delay?: (delayMs: number) => Promise<void>;
  fetchRef?: GitHubFetch;
  minRequestIntervalMs?: number;
  now?: () => number;
}

export interface GitHubImportClient {
  fetchGitHubJson(url: string): Promise<unknown>;
  fetchTextContent(url: string): Promise<string>;
  getDefaultBranch(owner: string, repo: string): Promise<string>;
  listMarkdownFiles(owner: string, repo: string, ref: string, basePath?: string): Promise<string[]>;
}

interface GitHubRepoInfo {
  default_branch?: string;
}

interface GitHubTreeEntry {
  path?: string;
  type?: string;
}

interface GitHubTreeResponse {
  tree?: GitHubTreeEntry[];
}

function getRuntimeFetch(): GitHubFetch {
  return fetch;
}

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function isMarkdownPath(path: string | null | undefined): boolean {
  return /\.(md|markdown)$/i.test(path || '');
}

export function getFileName(path: string | null | undefined): string {
  return (path || '').split('/').pop() || 'document.md';
}

export function buildRawGitHubUrl(owner: string, repo: string, ref: string, filePath: string): string {
  const encodedPath = filePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${encodedPath}`;
}

export function parseGitHubImportUrl(input: string | null | undefined): GitHubImportTarget | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL((input || '').trim());
  } catch (_) {
    return null;
  }

  const host = parsedUrl.hostname.replace(/^www\./, '');
  const segments = parsedUrl.pathname.split('/').filter(Boolean);

  if (host === 'raw.githubusercontent.com') {
    if (segments.length < 4) return null;
    const [owner, repo, ref, ...rest] = segments;
    const filePath = rest.join('/');
    return { owner, repo, ref, type: 'file', filePath };
  }

  if (host !== 'github.com' || segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  if (segments.length === 2) {
    return { owner, repo, type: 'repo' };
  }

  const mode = segments[2];
  if (mode === 'blob' && segments.length >= 5) {
    return {
      owner,
      repo,
      type: 'file',
      ref: segments[3],
      filePath: segments.slice(4).join('/')
    };
  }

  if (mode === 'tree' && segments.length >= 4) {
    return {
      owner,
      repo,
      type: 'tree',
      ref: segments[3],
      basePath: segments.slice(4).join('/')
    };
  }

  return { owner, repo, type: 'repo' };
}

export function buildMarkdownFileTree(paths: Array<string | null | undefined> | null | undefined): MarkdownFileTree {
  const root: MarkdownFileTree = { folders: {}, files: [] };
  (paths || []).forEach((path) => {
    const segments = (path || '').split('/').filter(Boolean);
    if (!segments.length) return;
    const fileName = segments.pop();
    if (!fileName) return;
    let node = root;
    segments.forEach((segment) => {
      if (!node.folders[segment]) {
        node.folders[segment] = { folders: {}, files: [] };
      }
      node = node.folders[segment];
    });
    node.files.push({ name: fileName, path: path || '' });
  });
  return root;
}

export function createGitHubImportClient(
  options: GitHubImportClientOptions = {}
): GitHubImportClient {
  const fetchRef = options.fetchRef ?? getRuntimeFetch();
  const minRequestIntervalMs =
    options.minRequestIntervalMs ?? DEFAULT_GITHUB_IMPORT_MIN_REQUEST_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const wait = options.delay ?? delay;
  let lastGitHubImportRequestAt = 0;

  async function fetchGitHubJson(url: string): Promise<unknown> {
    const currentTime = now();
    const waitTime = minRequestIntervalMs - (currentTime - lastGitHubImportRequestAt);
    if (waitTime > 0) {
      await wait(waitTime);
    }
    lastGitHubImportRequestAt = now();

    const response = await fetchRef(url, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    });
    if (!response.ok) {
      throw new Error(`GitHub API request failed (${response.status})`);
    }
    return response.json();
  }

  async function fetchTextContent(url: string): Promise<string> {
    const response = await fetchRef(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file (${response.status})`);
    }
    return response.text();
  }

  async function getDefaultBranch(owner: string, repo: string): Promise<string> {
    const repoInfo = await fetchGitHubJson(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
    ) as GitHubRepoInfo;
    return repoInfo.default_branch as string;
  }

  async function listMarkdownFiles(
    owner: string,
    repo: string,
    ref: string,
    basePath = ''
  ): Promise<string[]> {
    const treeResponse = await fetchGitHubJson(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`
    ) as GitHubTreeResponse;
    const normalizedBasePath = basePath.replace(/^\/+|\/+$/g, '');
    return (treeResponse.tree || [])
      .filter((entry) => entry.type === 'blob' && isMarkdownPath(entry.path))
      .filter((entry) => {
        const path = entry.path || '';
        return !normalizedBasePath || path === normalizedBasePath || path.startsWith(`${normalizedBasePath}/`);
      })
      .map((entry) => entry.path || '')
      .sort((a, b) => a.localeCompare(b));
  }

  return {
    fetchGitHubJson,
    fetchTextContent,
    getDefaultBranch,
    listMarkdownFiles
  };
}
