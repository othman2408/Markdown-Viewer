import {
  buildMarkdownTable,
  clampNumber
} from '../markdown/editing';

export interface OpenInsertTableModalOptions {
  documentRef?: Document;
  requestFrame?: (callback: FrameRequestCallback) => number;
  selectionEnd: number;
  selectionStart: number;
  insertBlock(input: {
    block: string;
    end: number;
    start: number;
  }): void;
}

export interface InsertTableModalElements {
  cancelButton: HTMLElement;
  columnInput: HTMLInputElement;
  confirmButton: HTMLElement;
  modal: HTMLElement;
  rowInput: HTMLInputElement;
}

export function buildClampedMarkdownTable(input: {
  columns: unknown;
  rows: unknown;
}): string {
  const columns = clampNumber(input.columns, 1, 20, 3);
  const rows = clampNumber(input.rows, 1, 20, 1);
  return buildMarkdownTable(columns, rows);
}

export function getInsertTableModalElements(documentRef: Document): InsertTableModalElements | null {
  const modal = documentRef.getElementById('table-modal');
  const columnInput = documentRef.getElementById('table-modal-columns') as HTMLInputElement | null;
  const rowInput = documentRef.getElementById('table-modal-rows') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('table-modal-insert');
  const cancelButton = documentRef.getElementById('table-modal-cancel');

  if (!modal || !columnInput || !rowInput || !confirmButton || !cancelButton) {
    return null;
  }

  return {
    cancelButton,
    columnInput,
    confirmButton,
    modal,
    rowInput
  };
}

export function openInsertTableModal(options: OpenInsertTableModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const elements = getInsertTableModalElements(documentRef);
  if (!elements) return false;

  const {
    cancelButton,
    columnInput,
    confirmButton,
    modal,
    rowInput
  } = elements;

  columnInput.value = '3';
  rowInput.value = '1';
  modal.style.display = 'flex';

  function cleanup(): void {
    confirmButton.removeEventListener('click', insertTable);
    cancelButton.removeEventListener('click', closeModal);
    columnInput.removeEventListener('keydown', onKey);
    rowInput.removeEventListener('keydown', onKey);
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function insertTable(): void {
    const table = buildClampedMarkdownTable({
      columns: columnInput.value,
      rows: rowInput.value
    });
    modal.style.display = 'none';
    cleanup();
    options.insertBlock({
      start: options.selectionStart,
      end: options.selectionEnd,
      block: table
    });
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      insertTable();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  confirmButton.addEventListener('click', insertTable);
  cancelButton.addEventListener('click', closeModal);
  columnInput.addEventListener('keydown', onKey);
  rowInput.addEventListener('keydown', onKey);

  requestFrame(() => {
    columnInput.focus();
    columnInput.select();
  });

  return true;
}
