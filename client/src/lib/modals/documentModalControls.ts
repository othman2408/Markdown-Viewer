export type NullableModalElement = HTMLElement | null | undefined;

export interface DocumentModalControlElements {
  aboutModal?: NullableModalElement;
  aboutModalClose?: NullableModalElement;
  aboutModalCloseIcon?: NullableModalElement;
  clearFormattingCancel?: NullableModalElement;
  clearFormattingClose?: NullableModalElement;
  clearFormattingConfirm?: NullableModalElement;
  clearFormattingModal?: NullableModalElement;
  helpModal?: NullableModalElement;
  helpModalClose?: NullableModalElement;
  helpModalCloseIcon?: NullableModalElement;
}

export interface DocumentModalControlHandlers {
  applyClearFormatting(): void;
  closeAppModal(modal: NullableModalElement): void;
}

export interface OpenAboutModalOptions {
  modal: NullableModalElement;
  openAppModal(modal: NullableModalElement): void;
  version: string;
  versionElement: HTMLElement | null | undefined;
}

function addClickListener(element: NullableModalElement, handler: () => void): void {
  if (element) {
    element.addEventListener('click', handler);
  }
}

export function attachDocumentModalControls(
  elements: DocumentModalControlElements,
  handlers: DocumentModalControlHandlers
): void {
  addClickListener(elements.clearFormattingConfirm, () => {
    handlers.applyClearFormatting();
    handlers.closeAppModal(elements.clearFormattingModal);
  });
  addClickListener(elements.clearFormattingCancel, () => {
    handlers.closeAppModal(elements.clearFormattingModal);
  });
  addClickListener(elements.clearFormattingClose, () => {
    handlers.closeAppModal(elements.clearFormattingModal);
  });
  addClickListener(elements.helpModalClose, () => {
    handlers.closeAppModal(elements.helpModal);
  });
  addClickListener(elements.helpModalCloseIcon, () => {
    handlers.closeAppModal(elements.helpModal);
  });
  addClickListener(elements.aboutModalClose, () => {
    handlers.closeAppModal(elements.aboutModal);
  });
  addClickListener(elements.aboutModalCloseIcon, () => {
    handlers.closeAppModal(elements.aboutModal);
  });
}

export function openDocumentModal(
  modal: NullableModalElement,
  openAppModal: (modal: NullableModalElement) => void
): boolean {
  if (!modal) return false;
  openAppModal(modal);
  return true;
}

export function openAboutDocumentModal(options: OpenAboutModalOptions): boolean {
  if (!options.modal) return false;
  if (options.versionElement) {
    options.versionElement.textContent = options.version;
  }
  options.openAppModal(options.modal);
  return true;
}
