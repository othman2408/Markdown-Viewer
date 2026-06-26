import {
  getModalElementId,
  prepareModalClose,
  prepareModalOpen,
  type ModalLifecyclePatch
} from './lifecycle';

export type FocusableModalElement = HTMLElement & {
  disabled?: boolean;
};

export interface AppModalOpenOptions {
  focusTarget?: HTMLElement | null;
  onClose?: () => void;
}

export interface AppModalLifecycleOptions {
  requestFrame?: (callback: FrameRequestCallback) => number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  syncModalState: (patch: ModalLifecyclePatch) => void;
}

export interface AppModalLifecycleController {
  close(modal: HTMLElement | null | undefined): void;
  getActiveModal(): HTMLElement | null;
  open(modal: HTMLElement | null | undefined, options?: AppModalOpenOptions): void;
}

type ModalHandlers = {
  handleKeydown: (event: KeyboardEvent) => void;
  handlePointerDown: (event: MouseEvent) => void;
};

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
const modalHandlers = new WeakMap<HTMLElement, ModalHandlers>();

export function getFocusableModalElements(container: ParentNode): FocusableModalElement[] {
  return Array.from(container.querySelectorAll<FocusableModalElement>(focusableSelector))
    .filter((element) => !element.disabled && element.offsetParent !== null);
}

export function trapFocusInModal(modal: HTMLElement, event: KeyboardEvent): void {
  const focusable = getFocusableModalElements(modal);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeElement = modal.ownerDocument.activeElement;

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function createAppModalLifecycle(
  options: AppModalLifecycleOptions
): AppModalLifecycleController {
  const requestFrame = options.requestFrame ?? getRuntimeRequestFrame();
  const setTimer = options.setTimer ?? globalThis.setTimeout.bind(globalThis);
  let activeModal: HTMLElement | null = null;
  let lastFocusedElement: Element | null = null;

  function detachHandlers(modal: HTMLElement): void {
    const handlers = modalHandlers.get(modal);
    if (!handlers) return;

    modal.removeEventListener('keydown', handlers.handleKeydown);
    modal.removeEventListener('mousedown', handlers.handlePointerDown);
    modalHandlers.delete(modal);
  }

  function close(modal: HTMLElement | null | undefined): void {
    if (!modal) return;

    const closeState = prepareModalClose(getModalElementId(activeModal), getModalElementId(modal));
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    detachHandlers(modal);

    if (activeModal === modal || closeState.closedActiveModal) {
      activeModal = null;
      options.syncModalState(closeState.statePatch || { activeModalId: null });
    }

    setTimer(() => {
      if (!modal.classList.contains('is-visible')) {
        modal.style.display = 'none';
      }
    }, 200);

    if (lastFocusedElement && typeof (lastFocusedElement as HTMLElement).focus === 'function') {
      (lastFocusedElement as HTMLElement).focus();
    }
  }

  function open(modal: HTMLElement | null | undefined, openOptions: AppModalOpenOptions = {}): void {
    if (!modal) return;

    const openState = prepareModalOpen(getModalElementId(activeModal), getModalElementId(modal));
    if (openState.shouldClosePrevious && activeModal && activeModal !== modal) {
      close(activeModal);
    }

    lastFocusedElement = modal.ownerDocument.activeElement;
    modal.style.display = 'flex';
    requestFrame(() => {
      modal.classList.add('is-visible');
    });
    modal.setAttribute('aria-hidden', 'false');
    activeModal = modal;
    options.syncModalState(openState.statePatch);

    const focusTarget = openOptions.focusTarget || getFocusableModalElements(modal)[0];
    focusTarget?.focus();

    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (openOptions.onClose) {
          openOptions.onClose();
        } else {
          close(modal);
        }
      } else if (event.key === 'Tab') {
        trapFocusInModal(modal, event);
      }
    };
    const handlePointerDown = (event: MouseEvent): void => {
      if (event.target === modal) {
        if (openOptions.onClose) {
          openOptions.onClose();
        } else {
          close(modal);
        }
      }
    };

    modal.addEventListener('keydown', handleKeydown);
    modal.addEventListener('mousedown', handlePointerDown);
    modalHandlers.set(modal, { handleKeydown, handlePointerDown });
  }

  return {
    close,
    getActiveModal() {
      return activeModal;
    },
    open
  };
}

function getRuntimeRequestFrame(): (callback: FrameRequestCallback) => number {
  return typeof globalThis.requestAnimationFrame === 'function'
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (callback) => {
        callback(0);
        return 0;
      };
}
