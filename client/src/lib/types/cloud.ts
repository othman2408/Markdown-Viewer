import type { WorkspaceBootstrap, WorkspacePayload } from './workspace';

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

export interface CloudClient {
  bootstrap(): Promise<WorkspaceBootstrap>;
  saveWorkspace(payload: WorkspacePayload): Promise<{ ok: true }>;
  createShare(input: { title: string; mode: 'view' | 'edit'; content: string }): Promise<ShareResponse>;
  uploadAsset(file: File): Promise<AssetUploadResponse>;
  logout(): Promise<{ ok: true }>;
  getShare(token: string): Promise<SharedDocumentResponse>;
}
