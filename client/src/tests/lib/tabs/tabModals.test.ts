// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  openRenameTabModal,
  openResetTabsModal,
  type AppModalOpenOptions
} from '../../../lib/tabs/tabModals';

function setRenameModalDom(): void {
  document.body.innerHTML = `
    <div id="rename-modal" style="display:none">
      <input id="rename-modal-input" />
      <button id="rename-modal-confirm">Rename</button>
      <button id="rename-modal-cancel">Cancel</button>
    </div>
  `;
}

function setResetModalDom(): void {
  document.body.innerHTML = `
    <div id="reset-confirm-modal" style="display:none">
      <button id="reset-modal-confirm">Delete All</button>
      <button id="reset-modal-cancel">Cancel</button>
    </div>
  `;
}

function createModalFns() {
  return {
    closeModal: vi.fn((modal: HTMLElement) => {
      modal.style.display = 'none';
    }),
    openModal: vi.fn((modal: HTMLElement, options?: AppModalOpenOptions) => {
      modal.style.display = 'flex';
      options?.focusTarget?.focus();
    })
  };
}

describe('tab modal helpers', () => {
  it('opens the rename modal with the current title selected', () => {
    setRenameModalDom();
    const input = document.getElementById('rename-modal-input') as HTMLInputElement;
    const { closeModal, openModal } = createModalFns();
    const onRename = vi.fn();

    expect(openRenameTabModal({
      closeModal,
      documentRef: document,
      onRename,
      openModal,
      title: 'Current title'
    })).toBe(true);

    expect(input.value).toBe('Current title');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Current title'.length);
    expect(openModal).toHaveBeenCalledWith(
      document.getElementById('rename-modal'),
      expect.objectContaining({
        focusTarget: input,
        onClose: expect.any(Function)
      })
    );
  });

  it('renames on confirm and cleans up listeners', () => {
    setRenameModalDom();
    const input = document.getElementById('rename-modal-input') as HTMLInputElement;
    const confirmButton = document.getElementById('rename-modal-confirm') as HTMLButtonElement;
    const { closeModal, openModal } = createModalFns();
    const onRename = vi.fn();

    openRenameTabModal({
      closeModal,
      documentRef: document,
      onRename,
      openModal,
      title: 'Old title'
    });

    input.value = 'New title';
    confirmButton.click();

    expect(onRename).toHaveBeenCalledWith('New title');
    expect(closeModal).toHaveBeenCalledWith(document.getElementById('rename-modal'));

    confirmButton.click();
    expect(onRename).toHaveBeenCalledOnce();
  });

  it('renames on Enter', () => {
    setRenameModalDom();
    const input = document.getElementById('rename-modal-input') as HTMLInputElement;
    const { closeModal, openModal } = createModalFns();
    const onRename = vi.fn();

    openRenameTabModal({
      closeModal,
      documentRef: document,
      onRename,
      openModal,
      title: 'Old title'
    });

    input.value = 'From keyboard';
    input.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter'
    }));

    expect(onRename).toHaveBeenCalledWith('From keyboard');
  });

  it('cancels rename without calling onRename', () => {
    setRenameModalDom();
    const { closeModal, openModal } = createModalFns();
    const onRename = vi.fn();

    openRenameTabModal({
      closeModal,
      documentRef: document,
      onRename,
      openModal,
      title: 'Old title'
    });

    document.getElementById('rename-modal-cancel')?.click();
    expect(closeModal).toHaveBeenCalledWith(document.getElementById('rename-modal'));
    expect(onRename).not.toHaveBeenCalled();

    const onClose = openModal.mock.calls[0][1]?.onClose as () => void;
    onClose();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('opens reset modal and resets on confirm after close', () => {
    setResetModalDom();
    const confirmButton = document.getElementById('reset-modal-confirm') as HTMLButtonElement;
    const events: string[] = [];
    const openModal = vi.fn((modal: HTMLElement, options?: AppModalOpenOptions) => {
      modal.style.display = 'flex';
      options?.focusTarget?.focus();
    });
    const closeModal = vi.fn(() => {
      events.push('close');
    });
    const onReset = vi.fn(() => {
      events.push('reset');
    });

    expect(openResetTabsModal({
      closeModal,
      documentRef: document,
      onReset,
      openModal
    })).toBe(true);

    expect(document.activeElement).toBe(confirmButton);
    confirmButton.click();
    expect(events).toEqual(['close', 'reset']);
    expect(onReset).toHaveBeenCalledOnce();

    confirmButton.click();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('cancels reset without calling onReset', () => {
    setResetModalDom();
    const { closeModal, openModal } = createModalFns();
    const onReset = vi.fn();

    openResetTabsModal({
      closeModal,
      documentRef: document,
      onReset,
      openModal
    });

    document.getElementById('reset-modal-cancel')?.click();
    expect(closeModal).toHaveBeenCalledWith(document.getElementById('reset-confirm-modal'));
    expect(onReset).not.toHaveBeenCalled();
  });

  it('returns false when required elements are missing', () => {
    document.body.innerHTML = '<div id="rename-modal"></div>';
    const { closeModal, openModal } = createModalFns();

    expect(openRenameTabModal({
      closeModal,
      documentRef: document,
      onRename: vi.fn(),
      openModal,
      title: 'Missing'
    })).toBe(false);

    document.body.innerHTML = '<div id="reset-confirm-modal"></div>';
    expect(openResetTabsModal({
      closeModal,
      documentRef: document,
      onReset: vi.fn(),
      openModal
    })).toBe(false);
  });
});
