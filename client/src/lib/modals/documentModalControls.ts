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

export interface DocumentModalControlsAttachment {
  detach(): void;
}

export interface OpenAboutModalOptions {
  modal: NullableModalElement;
  openAppModal(modal: NullableModalElement): void;
  version: string;
  versionElement: HTMLElement | null | undefined;
}

function addClickListener(
  listeners: Array<{ element: HTMLElement; handler: () => void }>,
  element: NullableModalElement,
  handler: () => void
): void {
  if (element) {
    element.addEventListener('click', handler);
    listeners.push({ element, handler });
  }
}

export function attachDocumentModalControls(
  elements: DocumentModalControlElements,
  handlers: DocumentModalControlHandlers
): DocumentModalControlsAttachment {
  const listeners: Array<{ element: HTMLElement; handler: () => void }> = [];

  addClickListener(listeners, elements.clearFormattingConfirm, () => {
    handlers.applyClearFormatting();
    handlers.closeAppModal(elements.clearFormattingModal);
  });
  addClickListener(listeners, elements.clearFormattingCancel, () => {
    handlers.closeAppModal(elements.clearFormattingModal);
  });
  addClickListener(listeners, elements.clearFormattingClose, () => {
    handlers.closeAppModal(elements.clearFormattingModal);
  });
  addClickListener(listeners, elements.helpModalClose, () => {
    handlers.closeAppModal(elements.helpModal);
  });
  addClickListener(listeners, elements.helpModalCloseIcon, () => {
    handlers.closeAppModal(elements.helpModal);
  });
  addClickListener(listeners, elements.aboutModalClose, () => {
    handlers.closeAppModal(elements.aboutModal);
  });
  addClickListener(listeners, elements.aboutModalCloseIcon, () => {
    handlers.closeAppModal(elements.aboutModal);
  });

  return {
    detach() {
      listeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      listeners.length = 0;
    }
  };
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
