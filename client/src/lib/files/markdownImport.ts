export const MAX_MARKDOWN_IMPORT_BYTES = 10 * 1024 * 1024;

export const MARKDOWN_IMPORT_ERRORS = {
  binary: 'Cannot import: The selected file appears to be a binary file.',
  read: 'Failed to read the file. Please check permissions and try again.',
  tooLarge: 'File is too large (maximum 10MB supported).'
} as const;

type AlertFn = (message: string) => void;

export interface MarkdownImportPayload {
  text: string;
  title: string;
}

export interface ReadMarkdownImportFileOptions {
  readFileText?: (file: File) => Promise<string>;
}

export interface ImportMarkdownFileToTabOptions extends ReadMarkdownImportFileOptions {
  alertRef?: AlertFn;
  createTab: (text: string, title: string) => void;
}

export interface MarkdownFileInputAttachmentOptions {
  fileInput: HTMLInputElement;
  importMarkdownFile: (file: File) => void;
}

export interface MarkdownFileInputAttachment {
  detach(): void;
}

function getRuntimeAlert(): AlertFn | undefined {
  if (typeof window === 'undefined' || typeof window.alert !== 'function') {
    return undefined;
  }

  return window.alert.bind(window);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result || '';
      resolve(typeof result === 'string' ? result : '');
    };
    reader.onerror = () => {
      reject(new Error(MARKDOWN_IMPORT_ERRORS.read));
    };
    reader.readAsText(file);
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isMarkdownUploadFile(file: Pick<File, 'name' | 'type'>): boolean {
  return file.type === 'text/markdown' || /\.(md|markdown)$/i.test(file.name || '');
}

export function getLocalMarkdownImportTitle(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

export function hasBinaryNullByte(text: string, checkLimit = 8000): boolean {
  const checkLength = Math.min(text.length, checkLimit);
  for (let index = 0; index < checkLength; index += 1) {
    if (text.charCodeAt(index) === 0) return true;
  }
  return false;
}

export async function readMarkdownImportFile(
  file: File,
  options: ReadMarkdownImportFileOptions = {}
): Promise<MarkdownImportPayload> {
  if (file.size > MAX_MARKDOWN_IMPORT_BYTES) {
    throw new Error(MARKDOWN_IMPORT_ERRORS.tooLarge);
  }

  const text = await (options.readFileText ?? readFileAsText)(file);
  if (hasBinaryNullByte(text)) {
    throw new Error(MARKDOWN_IMPORT_ERRORS.binary);
  }

  return {
    text,
    title: getLocalMarkdownImportTitle(file.name)
  };
}

export async function importMarkdownFileToTab(
  file: File,
  options: ImportMarkdownFileToTabOptions
): Promise<boolean> {
  try {
    const payload = await readMarkdownImportFile(file, options);
    options.createTab(payload.text, payload.title);
    return true;
  } catch (error) {
    const alertRef = options.alertRef ?? getRuntimeAlert();
    alertRef?.(getErrorMessage(error));
    return false;
  }
}

export function attachMarkdownFileInputController(
  options: MarkdownFileInputAttachmentOptions
): MarkdownFileInputAttachment {
  const handleChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (file) {
      options.importMarkdownFile(file);
    }
    options.fileInput.value = '';
  };

  options.fileInput.addEventListener('change', handleChange);

  return {
    detach() {
      options.fileInput.removeEventListener('change', handleChange);
    }
  };
}
