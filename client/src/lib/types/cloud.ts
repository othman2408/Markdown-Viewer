import type { DocumentTab, WorkspaceBootstrap, WorkspacePayload } from './workspace';

export interface LoginResponse {
  ok: true;
  csrfToken: string;
}

export interface ShareResponse {
  token: string;
  url: string;
}

export interface AssetUploadResponse {
  id: string;
  url: string;
}

export interface SharedDocumentResponse {
  token: string;
  title: string;
  mode: 'view' | 'edit';
  content: string;
}

export interface FileSummary {
  id: string;
  title: string;
  contentLength: number;
  contentPreview: string;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
}

export interface FileDetail extends DocumentTab {
  contentLength: number;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  title: string;
  contentHash: string;
  contentLength: number;
  contentPreview: string;
  source: 'autosave' | 'manual' | 'restore';
  createdAt: string;
}

export interface DocumentVersionDetail extends DocumentVersion {
  content: string;
}

export interface CloudClient {
  bootstrap(): Promise<WorkspaceBootstrap>;
  saveWorkspace(payload: WorkspacePayload): Promise<{ ok: true }>;
  createShare(input: { title: string; mode: 'view' | 'edit'; content: string }): Promise<ShareResponse>;
  uploadAsset(file: File): Promise<AssetUploadResponse>;
  logout(): Promise<{ ok: true }>;
  getShare(token: string): Promise<SharedDocumentResponse>;
  listFiles(input?: { query?: string; limit?: number }): Promise<{ files: FileSummary[] }>;
  getFile(id: string): Promise<FileDetail>;
  getFileHistory(id: string): Promise<{ versions: DocumentVersion[] }>;
  getFileVersion(id: string, versionId: string): Promise<DocumentVersionDetail>;
  restoreFileVersion(id: string, versionId: string): Promise<FileDetail>;
  copyFileVersion(id: string, versionId: string): Promise<FileDetail>;
  deleteFile(id: string): Promise<{ ok: true }>;
}
