import {
  getNextAvailableReferenceNumber,
  getUsedReferenceNumbers,
  sanitizeMarkdownTitle
} from '../markdown/editing';

export interface ReferenceSuggestion {
  referenceCounter: number;
  suggestedNumber: number;
}

export interface PreparedReferenceInsertion {
  caret: number;
  finalNumber: number;
  updatedValue: string;
}

export interface OpenInsertReferenceModalOptions {
  documentRef?: Document;
  getMarkdownValue: () => string;
  referenceCounter: number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  selectionEnd: number;
  selectionStart: number;
  applyReference(input: PreparedReferenceInsertion): void;
}

export interface InsertReferenceModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLElement;
  modal: HTMLElement;
  numberInput: HTMLInputElement;
  titleInput: HTMLInputElement;
  urlInput: HTMLInputElement;
}

export function getReferenceSuggestion(value: string, referenceCounter: number): ReferenceSuggestion {
  const used = getUsedReferenceNumbers(value);
  const maxUsed = used.size ? Math.max(...used) : 0;
  const nextReferenceCounter = Math.max(1, maxUsed + 1, referenceCounter);

  return {
    referenceCounter: nextReferenceCounter,
    suggestedNumber: getNextAvailableReferenceNumber(used, nextReferenceCounter)
  };
}

export function prepareReferenceInsertion(input: {
  numberText: string;
  selectionEnd: number;
  selectionStart: number;
  suggestedNumber: number;
  title: string;
  url: string;
  value: string;
}): PreparedReferenceInsertion {
  const usedNumbers = getUsedReferenceNumbers(input.value);
  const parsed = parseInt(input.numberText.replace(/[^\d]/g, ''), 10);
  const baseNumber = Number.isNaN(parsed) ? input.suggestedNumber : parsed;
  const finalNumber = getNextAvailableReferenceNumber(usedNumbers, baseNumber);
  const url = input.url.trim() || 'https://';
  const safeTitle = sanitizeMarkdownTitle(input.title.trim());
  const definition = `[${finalNumber}]: ${url}${safeTitle ? ` "${safeTitle}"` : ''}`;
  const selected = input.value.slice(input.selectionStart, input.selectionEnd);
  const inlineReference = `${selected}[${finalNumber}]`;
  const baseValue = input.value.slice(0, input.selectionStart)
    + inlineReference
    + input.value.slice(input.selectionEnd);
  const separator = baseValue.length && !baseValue.endsWith('\n') ? '\n' : '';
  const updatedValue = baseValue + separator + definition;

  return {
    caret: input.selectionStart + inlineReference.length,
    finalNumber,
    updatedValue
  };
}

export function getInsertReferenceModalElements(
  documentRef: Document
): InsertReferenceModalElements | null {
  const modal = documentRef.getElementById('reference-modal');
  const numberInput = documentRef.getElementById('reference-modal-number') as HTMLInputElement | null;
  const urlInput = documentRef.getElementById('reference-modal-url') as HTMLInputElement | null;
  const titleInput = documentRef.getElementById('reference-modal-title-input') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('reference-modal-apply');
  const cancelButton = documentRef.getElementById('reference-modal-cancel');

  if (!modal || !numberInput || !urlInput || !titleInput || !confirmButton || !cancelButton) {
    return null;
  }

  return {
    cancelButton,
    confirmButton,
    modal,
    numberInput,
    titleInput,
    urlInput
  };
}

export function openInsertReferenceModal(options: OpenInsertReferenceModalOptions): ReferenceSuggestion | null {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const elements = getInsertReferenceModalElements(documentRef);
  if (!elements) return null;

  const suggestion = getReferenceSuggestion(options.getMarkdownValue(), options.referenceCounter);
  const {
    cancelButton,
    confirmButton,
    modal,
    numberInput,
    titleInput,
    urlInput
  } = elements;

  numberInput.value = `[${suggestion.suggestedNumber}]`;
  urlInput.value = 'https://';
  titleInput.value = '';
  modal.style.display = 'flex';

  function cleanup(): void {
    confirmButton.removeEventListener('click', insertReference);
    cancelButton.removeEventListener('click', closeModal);
    numberInput.removeEventListener('keydown', onKey);
    urlInput.removeEventListener('keydown', onKey);
    titleInput.removeEventListener('keydown', onKey);
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function insertReference(): void {
    const prepared = prepareReferenceInsertion({
      numberText: numberInput.value,
      selectionEnd: options.selectionEnd,
      selectionStart: options.selectionStart,
      suggestedNumber: suggestion.suggestedNumber,
      title: titleInput.value,
      url: urlInput.value,
      value: options.getMarkdownValue()
    });

    options.applyReference(prepared);
    modal.style.display = 'none';
    cleanup();
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      insertReference();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  confirmButton.addEventListener('click', insertReference);
  cancelButton.addEventListener('click', closeModal);
  numberInput.addEventListener('keydown', onKey);
  urlInput.addEventListener('keydown', onKey);
  titleInput.addEventListener('keydown', onKey);

  requestFrame(() => {
    numberInput.focus();
    numberInput.select();
  });

  return suggestion;
}
