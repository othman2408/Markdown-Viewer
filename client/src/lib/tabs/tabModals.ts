export interface AppModalOpenOptions {
  focusTarget?: HTMLElement | null;
  onClose?: () => void;
}

export interface RenameTabModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLElement;
  input: HTMLInputElement;
  modal: HTMLElement;
}

export interface ResetTabsModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLElement;
  modal: HTMLElement;
}

export interface OpenRenameTabModalOptions {
  closeModal(modal: HTMLElement): void;
  documentRef?: Document;
  onRename(title: string): void;
  openModal(modal: HTMLElement, options?: AppModalOpenOptions): void;
  title: string;
}

export interface OpenResetTabsModalOptions {
  closeModal(modal: HTMLElement): void;
  documentRef?: Document;
  onReset(): void;
  openModal(modal: HTMLElement, options?: AppModalOpenOptions): void;
}

export function getRenameTabModalElements(documentRef: Document): RenameTabModalElements | null {
  const modal = documentRef.getElementById('rename-modal');
  const input = documentRef.getElementById('rename-modal-input') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('rename-modal-confirm');
  const cancelButton = documentRef.getElementById('rename-modal-cancel');

  if (!modal || !input || !confirmButton || !cancelButton) return null;

  return {
    cancelButton,
    confirmButton,
    input,
    modal
  };
}

export function getResetTabsModalElements(documentRef: Document): ResetTabsModalElements | null {
  const modal = documentRef.getElementById('reset-confirm-modal');
  const confirmButton = documentRef.getElementById('reset-modal-confirm');
  const cancelButton = documentRef.getElementById('reset-modal-cancel');

  if (!modal || !confirmButton || !cancelButton) return null;

  return {
    cancelButton,
    confirmButton,
    modal
  };
}

export function openRenameTabModal(options: OpenRenameTabModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const elements = getRenameTabModalElements(documentRef);
  if (!elements) return false;

  const {
    cancelButton,
    confirmButton,
    input,
    modal
  } = elements;

  function cleanup(): void {
    confirmButton.removeEventListener('click', doRename);
    cancelButton.removeEventListener('click', doCancel);
    input.removeEventListener('keydown', onKey);
  }

  function doRename(): void {
    options.onRename(input.value);
    options.closeModal(modal);
    cleanup();
  }

  function doCancel(): void {
    options.closeModal(modal);
    cleanup();
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      doRename();
    }
  }

  input.value = options.title;
  confirmButton.addEventListener('click', doRename);
  cancelButton.addEventListener('click', doCancel);
  input.addEventListener('keydown', onKey);
  options.openModal(modal, {
    focusTarget: input,
    onClose: doCancel
  });
  input.select();

  return true;
}

export function openResetTabsModal(options: OpenResetTabsModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const elements = getResetTabsModalElements(documentRef);
  if (!elements) return false;

  const {
    cancelButton,
    confirmButton,
    modal
  } = elements;

  function cleanup(): void {
    confirmButton.removeEventListener('click', doReset);
    cancelButton.removeEventListener('click', doCancel);
  }

  function doReset(): void {
    options.closeModal(modal);
    cleanup();
    options.onReset();
  }

  function doCancel(): void {
    options.closeModal(modal);
    cleanup();
  }

  confirmButton.addEventListener('click', doReset);
  cancelButton.addEventListener('click', doCancel);
  options.openModal(modal, {
    focusTarget: confirmButton,
    onClose: doCancel
  });

  return true;
}
