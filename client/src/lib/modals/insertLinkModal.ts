export interface OpenInsertLinkModalOptions {
  documentRef?: Document;
  requestFrame?: (callback: FrameRequestCallback) => number;
  selectionEnd: number;
  selectionStart: number;
  selectedText: string;
  replaceRange(input: {
    end: number;
    replacement: string;
    selectionEnd: number;
    selectionStart: number;
    start: number;
  }): void;
}

export interface InsertLinkModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLElement;
  modal: HTMLElement;
  textInput: HTMLInputElement;
  urlInput: HTMLInputElement;
}

export function buildMarkdownLink(input: {
  selectedText?: string;
  text?: string;
  url?: string;
}): string {
  const url = input.url?.trim() || 'https://';
  const text = input.text?.trim() || input.selectedText || 'link text';
  return `[${text}](${url})`;
}

export function getInsertLinkModalElements(
  documentRef: Document
): InsertLinkModalElements | null {
  const modal = documentRef.getElementById('link-modal');
  const urlInput = documentRef.getElementById('link-modal-url') as HTMLInputElement | null;
  const textInput = documentRef.getElementById('link-modal-text') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('link-modal-apply');
  const cancelButton = documentRef.getElementById('link-modal-cancel');

  if (!modal || !urlInput || !textInput || !confirmButton || !cancelButton) {
    return null;
  }

  return {
    cancelButton,
    confirmButton,
    modal,
    textInput,
    urlInput
  };
}

export function openInsertLinkModal(options: OpenInsertLinkModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const elements = getInsertLinkModalElements(documentRef);
  if (!elements) return false;

  const {
    cancelButton,
    confirmButton,
    modal,
    textInput,
    urlInput
  } = elements;

  urlInput.value = 'https://';
  textInput.value = options.selectedText || '';
  modal.style.display = 'flex';

  function cleanup(): void {
    confirmButton.removeEventListener('click', applyLink);
    cancelButton.removeEventListener('click', closeModal);
    urlInput.removeEventListener('keydown', onKey);
    textInput.removeEventListener('keydown', onKey);
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function applyLink(): void {
    const replacement = buildMarkdownLink({
      selectedText: options.selectedText,
      text: textInput.value,
      url: urlInput.value
    });
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

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyLink();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  confirmButton.addEventListener('click', applyLink);
  cancelButton.addEventListener('click', closeModal);
  urlInput.addEventListener('keydown', onKey);
  textInput.addEventListener('keydown', onKey);

  requestFrame(() => {
    urlInput.focus();
    urlInput.select();
  });

  return true;
}
