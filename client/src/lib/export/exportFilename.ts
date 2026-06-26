export interface CreateExportFilenameOptions {
  extension: string;
  fallback: string;
  title?: string | null;
}

export function sanitizeExportTitle(title: string): string {
  return title
    .replace(/\.(md|markdown|html|pdf|png)$/i, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
}

export function createExportFilename(options: CreateExportFilenameOptions): string {
  const title = options.title ? sanitizeExportTitle(options.title) : '';

  return title ? `${title}.${options.extension}` : options.fallback;
}
