export type ViewMode = "editor" | "split" | "preview";
export type ShareMode = "edit" | "view";
export type JsonObject = Record<string, unknown>;
export type HttpError = Error & { status?: number; statusCode?: number };

export interface NormalizedTab {
  id: string;
  title: string;
  content: string;
  scrollPos: number;
  viewMode: ViewMode;
  sortOrder: number;
  createdAt: number;
}

export interface NormalizedWorkspaceBody {
  activeTabId: string | null;
  findReplaceDocked: boolean;
  globalState: JsonObject;
  tabs: NormalizedTab[];
  untitledCounter: number;
}

export interface ClientTab {
  id: string;
  title: string;
  content: string;
  scrollPos: number;
  viewMode: ViewMode;
  createdAt: number;
}

export interface DocumentRow {
  id: string;
  title: string;
  content: string | null;
  scroll_pos: number | null;
  view_mode: ViewMode | null;
  client_created_at: string | number | null;
  created_at: string | Date;
  updated_at?: string | Date;
}

export interface WorkspaceStateRow {
  active_tab_id: string | null;
  find_replace_docked: boolean | null;
  global_state: JsonObject | null;
  untitled_counter: number | string | null;
}

export interface AssetRow {
  object_key: string;
  content_type: string | null;
}

export interface ShareRow {
  asset_ids?: unknown;
  content: string | null;
  content_object_key: string | null;
  mode: ShareMode;
  title: string;
  token: string;
}

export interface FileSummaryRow {
  id: string;
  title: string;
  content_length: number | string | null;
  content_preview: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  version_count: number | string | null;
}

export interface FileDetailRow extends DocumentRow {
  content_length: number | string | null;
  updated_at: string | Date;
}

export interface DocumentVersionRow {
  id: string;
  document_id: string;
  title: string;
  content?: string | null;
  content_hash: string;
  content_length: number | string | null;
  content_preview: string | null;
  source: "autosave" | "manual" | "restore";
  created_at: string | Date;
}
