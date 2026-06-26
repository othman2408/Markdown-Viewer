import {
  createContentDirectionController,
  createGlobalPreferencesController,
  type ContentDirection,
  type ContentDirectionController,
  type GlobalPreferencesController
} from '../preferences/globalPreferences';
import { createLibraryLoader } from '../runtime/libraryLoader';
import { createCloudWorkspace } from '../cloud/workspace';
import {
  createWorkspaceStorage,
  type WorkspaceStorage
} from '../workspace/persistence';
import {
  ACTIVE_TAB_KEY,
  GLOBAL_STATE_KEY,
  STORAGE_KEY,
  UNTITLED_COUNTER_KEY
} from '../config/appConfig';
import type { WorkspacePayload } from '../types/workspace';

export const DEFAULT_MARKDOWN_DOCUMENT = '# Welcome to Markdown Viewer\n\nStart typing your markdown here...';

type AlertFn = (message: string) => void;
type ConsoleErrorRef = Pick<Console, 'error'>;
type PreferenceWindowRef = {
  matchMedia?: (query: string) => Pick<MediaQueryList, 'matches'>;
};
type SyncEditorState = (patch: { direction: ContentDirection }) => void;
type SyncUiState = (patch: { theme: 'dark' | 'light' }) => void;
type CoreLibraryRuntime = ReturnType<typeof createLibraryLoader>;
type CloudWorkspaceController = ReturnType<typeof createCloudWorkspace>;

export type GlobalPreferencesRuntime = {
  contentDirectionController: ContentDirectionController;
  globalPreferences: GlobalPreferencesController;
  initialTheme: 'dark' | 'light';
};

export type CoreLibraryRuntimeOptions = {
  alertFn?: AlertFn;
  consoleRef?: ConsoleErrorRef;
  createLoader?: typeof createLibraryLoader;
};

export type GlobalPreferencesRuntimeOptions = {
  documentRef?: Document;
  readStorageItem(key: string): string | null;
  saveStorageItem(key: string, value: string): void;
  syncEditorState: SyncEditorState;
  syncUiState: SyncUiState;
  syncWorkspaceState: () => void;
  windowRef?: PreferenceWindowRef;
};

export type WorkspaceRuntimeOptions = {
  cloudWorkspaceFactory?: typeof createCloudWorkspace;
  getWorkspacePayload(): WorkspacePayload;
  workspaceStorageFactory?: typeof createWorkspaceStorage;
};

export type WorkspaceRuntime = {
  cloudApi: CloudWorkspaceController['api'];
  cloudStorage: CloudWorkspaceController['state'];
  cloudWorkspace: CloudWorkspaceController;
  flushCloudWorkspaceSave: CloudWorkspaceController['flushWorkspaceSave'];
  isCloudSharePage: CloudWorkspaceController['isCloudSharePage'];
  readStorageItem: CloudWorkspaceController['readStorageItem'];
  saveStorageItem: CloudWorkspaceController['saveStorageItem'];
  syncCloudStateSnapshot: CloudWorkspaceController['syncCloudStateSnapshot'];
  workspaceStorage: WorkspaceStorage;
};

export async function initializeCoreLibraryRuntime(
  options: CoreLibraryRuntimeOptions = {}
): Promise<CoreLibraryRuntime | null> {
  const loader = (options.createLoader ?? createLibraryLoader)();
  try {
    await loader.ensureCoreLibraries();
    return loader;
  } catch (error) {
    const consoleRef = options.consoleRef ?? console;
    const alertFn = options.alertFn ?? (globalThis as typeof globalThis & { alert?: AlertFn }).alert;

    consoleRef.error('Failed to load required libraries:', error);
    alertFn?.('Failed to load required editor libraries. Please refresh and try again.');
    return null;
  }
}

export async function initializeWorkspaceRuntime(
  options: WorkspaceRuntimeOptions
): Promise<WorkspaceRuntime> {
  const cloudWorkspace = (options.cloudWorkspaceFactory ?? createCloudWorkspace)({
    getWorkspacePayload: options.getWorkspacePayload
  });
  const readStorageItem = cloudWorkspace.readStorageItem;
  const saveStorageItem = cloudWorkspace.saveStorageItem;
  const workspaceStorage = (options.workspaceStorageFactory ?? createWorkspaceStorage)({
    keys: {
      tabs: STORAGE_KEY,
      activeTabId: ACTIVE_TAB_KEY,
      untitledCounter: UNTITLED_COUNTER_KEY
    },
    readStorageItem,
    saveStorageItem
  });

  await cloudWorkspace.init();

  return {
    cloudApi: cloudWorkspace.api,
    cloudStorage: cloudWorkspace.state,
    cloudWorkspace,
    flushCloudWorkspaceSave: cloudWorkspace.flushWorkspaceSave,
    isCloudSharePage: cloudWorkspace.isCloudSharePage,
    readStorageItem,
    saveStorageItem,
    syncCloudStateSnapshot: cloudWorkspace.syncCloudStateSnapshot,
    workspaceStorage
  };
}

export function initializeGlobalPreferencesRuntime(
  options: GlobalPreferencesRuntimeOptions
): GlobalPreferencesRuntime {
  const documentRef = options.documentRef ?? document;
  const windowRef = options.windowRef ?? window;
  const globalPreferences = createGlobalPreferencesController({
    key: GLOBAL_STATE_KEY,
    readStorageItem: options.readStorageItem,
    saveStorageItem: options.saveStorageItem,
    syncWorkspaceState: options.syncWorkspaceState
  });
  const prefersDarkMode = Boolean(
    windowRef.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  const initialTheme = globalPreferences.getInitialTheme(prefersDarkMode);

  documentRef.documentElement.setAttribute('data-theme', initialTheme);
  options.syncUiState({ theme: initialTheme === 'dark' ? 'dark' : 'light' });

  const contentDirectionController = createContentDirectionController({
    initialDirection: globalPreferences.getInitialDirection(),
    persistDirection(direction) {
      globalPreferences.save({ direction });
    },
    syncDirection(direction) {
      options.syncEditorState({ direction });
    }
  });
  contentDirectionController.apply(contentDirectionController.getDirection());

  return {
    contentDirectionController,
    globalPreferences,
    initialTheme
  };
}

export function readDefaultMarkdownDocument(
  documentRef: Document = document,
  templateId = 'default-markdown'
): string {
  const defaultMarkdownTemplate = documentRef.getElementById(templateId) as
    | (HTMLElement & { content?: DocumentFragment })
    | null;
  let templateText = '';

  if (defaultMarkdownTemplate) {
    if (
      defaultMarkdownTemplate.content &&
      typeof defaultMarkdownTemplate.content.textContent === 'string'
    ) {
      templateText = defaultMarkdownTemplate.content.textContent.trim();
    } else {
      templateText = defaultMarkdownTemplate.textContent
        ? defaultMarkdownTemplate.textContent.trim()
        : '';
    }
  }

  return templateText || DEFAULT_MARKDOWN_DOCUMENT;
}
