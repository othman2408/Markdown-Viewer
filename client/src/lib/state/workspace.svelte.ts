import type { DocumentTab, WorkspacePayload } from '../types/workspace';
import { getActiveTab, normalizeWorkspacePayload } from '../workspace/actions';

export interface WorkspaceStateApi {
  readonly snapshot: WorkspacePayload;
  readonly tabs: DocumentTab[];
  readonly activeTabId: string | null;
  readonly activeTab: DocumentTab | null;
  subscribe(run: (value: WorkspacePayload) => void): () => void;
  replace(payload: Partial<WorkspacePayload>): void;
  setActiveTab(tabId: string | null): void;
  updateActiveTab(patch: Partial<DocumentTab>): void;
}

export function createWorkspaceState(initial: Partial<WorkspacePayload> = {}): WorkspaceStateApi {
  let snapshot = $state<WorkspacePayload>(normalizeWorkspacePayload(initial));
  const activeTab = $derived(getActiveTab(snapshot));
  const subscribers = new Set<(value: WorkspacePayload) => void>();

  function emit(): void {
    const value = normalizeWorkspacePayload(snapshot);
    subscribers.forEach((run) => run(value));
  }

  function replace(payload: Partial<WorkspacePayload>): void {
    snapshot = normalizeWorkspacePayload({ ...snapshot, ...payload });
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    get tabs() {
      return snapshot.tabs;
    },
    get activeTabId() {
      return snapshot.activeTabId;
    },
    get activeTab() {
      return activeTab;
    },
    subscribe(run) {
      run(normalizeWorkspacePayload(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    },
    replace(payload) {
      replace(payload);
    },
    setActiveTab(tabId) {
      replace({ activeTabId: tabId });
    },
    updateActiveTab(patch) {
      if (!snapshot.activeTabId) return;
      replace({
        tabs: snapshot.tabs.map((tab) => (
          tab.id === snapshot.activeTabId ? { ...tab, ...patch } : tab
        ))
      });
    }
  };
}

export const workspaceState = createWorkspaceState();
