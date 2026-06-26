export type ViewMode = 'editor' | 'split' | 'preview';
export type TabMenuAction = 'rename' | 'duplicate' | 'delete';

export interface DocumentTab {
  id: string;
  title: string;
  content: string;
  scrollPos: number;
  viewMode: ViewMode;
  createdAt: number;
}

export interface WorkspacePayload {
  tabs: DocumentTab[];
  activeTabId: string | null;
  untitledCounter: number;
  globalState: Record<string, unknown>;
  findReplaceDocked: boolean;
}

export interface WorkspaceBootstrap extends WorkspacePayload {
  csrfToken: string;
}
