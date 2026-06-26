import { sanitizeMarkdownTitle } from '../markdown/editing';

export interface OpenInsertImageModalOptions {
  alertMessage(message: string): void;
  cloudStorageEnabled: boolean;
  consoleRef?: Pick<Console, 'error'>;
  createObjectUrl(file: File): string;
  documentRef?: Document;
  replaceRange(input: {
    end: number;
    replacement: string;
    selectionEnd: number;
    selectionStart: number;
    start: number;
  }): void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  selectedText: string;
  selectionEnd: number;
  selectionStart: number;
  trackObjectUrl(url: string): void;
  uploadFile?(file: File): Promise<string>;
}

export interface InsertImageModalElements {
  altInput: HTMLInputElement;
  cancelButton: HTMLElement;
  confirmButton: HTMLButtonElement;
  fileInput: HTMLInputElement;
  modal: HTMLElement;
  uploadFields: HTMLElement;
  uploadOption: HTMLInputElement;
  urlFields: HTMLElement;
  urlInput: HTMLInputElement;
  urlOption: HTMLInputElement;
}

export interface CleanupImageObjectUrlsOptions {
  contents: string[];
  objectUrls: Set<string>;
  revokeObjectUrl(url: string): void;
}

export function getInsertImageModalElements(documentRef: Document): InsertImageModalElements | null {
  const modal = documentRef.getElementById('image-modal');
  const uploadOption = documentRef.getElementById('image-source-upload') as HTMLInputElement | null;
  const urlOption = documentRef.getElementById('image-source-url') as HTMLInputElement | null;
  const uploadFields = documentRef.getElementById('image-upload-fields');
  const urlFields = documentRef.getElementById('image-url-fields');
  const fileInput = documentRef.getElementById('image-modal-file') as HTMLInputElement | null;
  const urlInput = documentRef.getElementById('image-modal-url') as HTMLInputElement | null;
  const altInput = documentRef.getElementById('image-modal-alt') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('image-modal-insert') as HTMLButtonElement | null;
  const cancelButton = documentRef.getElementById('image-modal-cancel');

  if (
    !modal ||
    !uploadOption ||
    !urlOption ||
    !uploadFields ||
    !urlFields ||
    !fileInput ||
    !urlInput ||
    !altInput ||
    !confirmButton ||
    !cancelButton
  ) {
    return null;
  }

  return {
    altInput,
    cancelButton,
    confirmButton,
    fileInput,
    modal,
    uploadFields,
    uploadOption,
    urlFields,
    urlInput,
    urlOption
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function cleanupTrackedImageObjectUrls(options: CleanupImageObjectUrlsOptions): string[] {
  if (options.objectUrls.size === 0) return [];

  const snapshot = options.contents.join('\n');
  const revoked: string[] = [];

  for (const url of Array.from(options.objectUrls)) {
    if (!snapshot.includes(url)) {
      options.revokeObjectUrl(url);
      options.objectUrls.delete(url);
      revoked.push(url);
    }
  }

  return revoked;
}

export function openInsertImageModal(options: OpenInsertImageModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const consoleRef = options.consoleRef ?? console;
  const elements = getInsertImageModalElements(documentRef);
  if (!elements) return false;

  const {
    altInput,
    cancelButton,
    confirmButton,
    fileInput,
    modal,
    uploadFields,
    uploadOption,
    urlFields,
    urlInput,
    urlOption
  } = elements;
  let isUploadingImage = false;

  function buildImageMarkdown(url: string): string {
    const titleText = altInput.value.trim();
    const altText = titleText || 'alt text';
    const safeTitle = sanitizeMarkdownTitle(titleText);
    const titlePart = safeTitle ? ` "${safeTitle}"` : '';
    return `![${altText}](${url}${titlePart})`;
  }

  function cleanup(): void {
    confirmButton.removeEventListener('click', onConfirm);
    cancelButton.removeEventListener('click', closeModal);
    uploadOption.removeEventListener('change', onModeChange);
    urlOption.removeEventListener('change', onModeChange);
    fileInput.removeEventListener('change', onFileChange);
    fileInput.removeEventListener('keydown', onKey);
    urlInput.removeEventListener('keydown', onKey);
    altInput.removeEventListener('keydown', onKey);
  }

  function insertImage(url: string): void {
    const safeUrl = url.trim() || 'https://';
    const replacement = buildImageMarkdown(safeUrl);
    modal.style.display = 'none';
    cleanup();
    options.replaceRange({
      start: options.selectionStart,
      end: options.selectionEnd,
      replacement,
      selectionStart: options.selectionStart + replacement.length,
      selectionEnd: options.selectionStart + replacement.length
    });
  }

  function insertFromFile(file: File): void {
    if (options.cloudStorageEnabled) {
      if (isUploadingImage) return;
      if (!options.uploadFile) {
        options.alertMessage('Image upload failed: upload is not configured');
        return;
      }

      isUploadingImage = true;
      confirmButton.disabled = true;
      options.uploadFile(file)
        .then((url) => insertImage(url))
        .catch((error: unknown) => {
          consoleRef.error('Image upload failed:', error);
          options.alertMessage(`Image upload failed: ${getErrorMessage(error)}`);
        })
        .finally(() => {
          isUploadingImage = false;
          confirmButton.disabled = false;
        });
      return;
    }

    const objectUrl = options.createObjectUrl(file);
    options.trackObjectUrl(objectUrl);
    insertImage(objectUrl);
  }

  function updateMode(shouldFocus: boolean): void {
    const isUpload = uploadOption.checked;
    uploadFields.style.display = isUpload ? 'flex' : 'none';
    urlFields.style.display = isUpload ? 'none' : 'flex';

    if (shouldFocus) {
      requestFrame(() => {
        if (isUpload) {
          fileInput.focus();
        } else {
          urlInput.focus();
          urlInput.select();
        }
      });
    }
  }

  function onModeChange(): void {
    updateMode(true);
  }

  function onFileChange(): void {
    const file = fileInput.files?.[0];
    if (file) {
      insertFromFile(file);
    }
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (uploadOption.checked) {
        const file = fileInput.files?.[0];
        if (file) {
          insertFromFile(file);
        } else {
          fileInput.click();
        }
      } else {
        insertImage(urlInput.value);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  function onConfirm(): void {
    if (uploadOption.checked) {
      const file = fileInput.files?.[0];
      if (file) {
        insertFromFile(file);
      } else {
        fileInput.click();
      }
    } else {
      insertImage(urlInput.value);
    }
  }

  urlInput.value = 'https://';
  altInput.value = options.selectedText || '';
  fileInput.value = '';
  urlOption.checked = true;
  uploadOption.checked = false;
  confirmButton.disabled = false;
  modal.style.display = 'flex';

  confirmButton.addEventListener('click', onConfirm);
  cancelButton.addEventListener('click', closeModal);
  uploadOption.addEventListener('change', onModeChange);
  urlOption.addEventListener('change', onModeChange);
  fileInput.addEventListener('change', onFileChange);
  fileInput.addEventListener('keydown', onKey);
  urlInput.addEventListener('keydown', onKey);
  altInput.addEventListener('keydown', onKey);
  updateMode(true);

  return true;
}
