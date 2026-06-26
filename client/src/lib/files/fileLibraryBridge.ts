export type FileVersionOpenMode = 'replace' | 'copy';

export interface FileLibraryBridge {
  deleteFile(id: string): Promise<void>;
  openFile(id: string): Promise<void>;
  restoreVersion(fileId: string, versionId: string, mode: FileVersionOpenMode): Promise<void>;
}

declare global {
  interface Window {
    markdownViewerFiles?: FileLibraryBridge;
  }
}

export function dispatchFileOpen(id: string): Promise<void> {
  return window.markdownViewerFiles?.openFile?.(id) ?? Promise.reject(new Error('file_library_unavailable'));
}

export function dispatchFileDelete(id: string): Promise<void> {
  return window.markdownViewerFiles?.deleteFile?.(id) ?? Promise.reject(new Error('file_library_unavailable'));
}

export function dispatchFileVersionRestore(
  fileId: string,
  versionId: string,
  mode: FileVersionOpenMode
): Promise<void> {
  return window.markdownViewerFiles?.restoreVersion?.(fileId, versionId, mode) ??
    Promise.reject(new Error('file_library_unavailable'));
}
