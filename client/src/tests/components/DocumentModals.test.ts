// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentModals from '../../components/modals/DocumentModals.svelte';
import { modalState } from '../../lib/state/modals.svelte';

function resetModalState() {
  modalState.replace({
    activeModalId: null,
    findReplaceOpen: false,
    findReplaceDocked: false,
    findReplaceDrawerOpen: false,
    findReplaceErrorVisible: false,
    findReplaceErrorMessage: '',
    findReplaceMatchCurrent: 0,
    findReplaceMatchTotal: 0,
    findReplaceHasQuery: false,
    findReplaceMatchCase: false,
    findReplaceWholeWord: false,
    findReplaceUseRegex: false,
    findReplaceInSelection: false,
    findReplacePreserveCase: false,
    findReplaceWrapAround: true,
    shareOpen: false,
    shareMode: 'view',
    shareUrl: '',
    shareCopyDisabled: true,
    shareCopySucceeded: false
  });
}

describe('DocumentModals', () => {
  beforeEach(() => {
    delete window.markdownViewerShare;
    resetModalState();
  });

  afterEach(() => {
    cleanup();
    delete window.markdownViewerShare;
    resetModalState();
  });

  it('keeps static document modal contracts stable for app wiring', () => {
    const { container } = render(DocumentModals);
    const diffModal = container.querySelector<HTMLDivElement>('#find-replace-diff-modal');
    const helpModal = container.querySelector<HTMLDivElement>('#help-modal');
    const aboutModal = container.querySelector<HTMLDivElement>('#about-modal');
    const renameModal = container.querySelector<HTMLDivElement>('#rename-modal');

    for (const modal of [diffModal, helpModal, aboutModal, renameModal]) {
      expect(modal).not.toBeNull();
      expect(modal?.getAttribute('role')).toBe('dialog');
      expect(modal?.getAttribute('aria-modal')).toBe('true');
      expect(modal?.getAttribute('aria-hidden')).toBe('true');
      expect(modal?.getAttribute('style')).toContain('display:none');
    }

    expect(container.querySelector('#find-replace-diff-container')?.classList.contains('diff-container')).toBe(true);
    expect(container.querySelector('#help-modal-title')?.textContent).toBe('Markdown Viewer Help');
    expect(container.querySelector<HTMLImageElement>('.about-logo')?.getAttribute('src')).toBe('/assets/icon.jpg');
    expect(container.querySelector('#about-version')).not.toBeNull();
    expect(container.querySelector<HTMLInputElement>('#rename-modal-input')?.placeholder).toBe('File name');
    expect(container.querySelector('#rename-modal-confirm')?.textContent).toBe('Rename');
  });

  it('keeps the share modal contract while rendering share state from Svelte', async () => {
    const { container } = render(DocumentModals);
    const shareModal = container.querySelector<HTMLDivElement>('#share-modal');
    const viewRadio = container.querySelector<HTMLInputElement>('#share-mode-view');
    const editRadio = container.querySelector<HTMLInputElement>('#share-mode-edit');
    const viewCard = container.querySelector<HTMLLabelElement>('#share-card-view');
    const editCard = container.querySelector<HTMLLabelElement>('#share-card-edit');
    const urlInput = container.querySelector<HTMLInputElement>('#share-url-input');
    const copyButton = container.querySelector<HTMLButtonElement>('#share-copy-btn');
    const copyIcon = copyButton?.querySelector('i');

    expect(shareModal?.classList.contains('is-visible')).toBe(false);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('true');
    expect(shareModal?.style.display).toBe('');
    expect(viewRadio?.checked).toBe(true);
    expect(editRadio?.checked).toBe(false);
    expect(viewCard?.classList.contains('is-selected')).toBe(true);
    expect(editCard?.classList.contains('is-selected')).toBe(false);
    expect(urlInput?.value).toBe('');
    expect(copyButton?.disabled).toBe(true);
    expect(copyIcon?.classList.contains('bi-clipboard')).toBe(true);
    expect(copyIcon?.classList.contains('bi-check-lg')).toBe(false);

    modalState.replace({
      activeModalId: 'share-modal',
      shareOpen: true,
      shareMode: 'edit',
      shareUrl: 'https://example.com/share/token?edit=1',
      shareCopyDisabled: false,
      shareCopySucceeded: true
    });
    await tick();

    expect(shareModal?.classList.contains('is-visible')).toBe(true);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('false');
    expect(viewRadio?.checked).toBe(false);
    expect(editRadio?.checked).toBe(true);
    expect(viewCard?.classList.contains('is-selected')).toBe(false);
    expect(editCard?.classList.contains('is-selected')).toBe(true);
    expect(urlInput?.value).toBe('https://example.com/share/token?edit=1');
    expect(copyButton?.disabled).toBe(false);
    expect(copyIcon?.classList.contains('bi-clipboard')).toBe(false);
    expect(copyIcon?.classList.contains('bi-check-lg')).toBe(true);

    modalState.replace({
      activeModalId: null,
      shareOpen: false,
      shareCopySucceeded: false
    });
    await tick();

    expect(shareModal?.classList.contains('is-visible')).toBe(false);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('true');
    expect(copyIcon?.classList.contains('bi-clipboard')).toBe(true);
    expect(copyIcon?.classList.contains('bi-check-lg')).toBe(false);
  });

  it('updates share mode state from the rendered radio controls', async () => {
    const selectMode = vi.fn();
    window.markdownViewerShare = { selectMode };
    const { container } = render(DocumentModals);
    const editRadio = container.querySelector<HTMLInputElement>('#share-mode-edit');
    const editCard = container.querySelector<HTMLLabelElement>('#share-card-edit');

    expect(editRadio).not.toBeNull();
    await fireEvent.click(editRadio as HTMLInputElement);
    await tick();

    expect(editRadio?.checked).toBe(true);
    expect(editCard?.classList.contains('is-selected')).toBe(true);
    expect(selectMode).toHaveBeenCalledTimes(1);
    expect(selectMode).toHaveBeenCalledWith('edit');
  });

  it('closes the share modal from Svelte-owned close controls', async () => {
    const { container } = render(DocumentModals);
    const shareModal = container.querySelector<HTMLDivElement>('#share-modal');
    const closeIcon = container.querySelector<HTMLButtonElement>('#share-modal-close-icon');
    const closeButton = container.querySelector<HTMLButtonElement>('#share-modal-close');

    modalState.replace({
      activeModalId: 'share-modal',
      shareOpen: true
    });
    await tick();

    await fireEvent.click(closeIcon as HTMLButtonElement);
    await tick();
    expect(shareModal?.classList.contains('is-visible')).toBe(false);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('true');

    modalState.replace({
      activeModalId: 'share-modal',
      shareOpen: true
    });
    await tick();

    await fireEvent.click(closeButton as HTMLButtonElement);
    await tick();
    expect(shareModal?.classList.contains('is-visible')).toBe(false);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('true');
  });

  it('closes the share modal from overlay click and Escape key', async () => {
    const { container } = render(DocumentModals);
    const shareModal = container.querySelector<HTMLDivElement>('#share-modal');

    modalState.replace({
      activeModalId: 'share-modal',
      shareOpen: true
    });
    await tick();

    await fireEvent.click(shareModal as HTMLDivElement);
    await tick();
    expect(shareModal?.classList.contains('is-visible')).toBe(false);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('true');

    modalState.replace({
      activeModalId: 'share-modal',
      shareOpen: true
    });
    await tick();

    await fireEvent.keyDown(window, { key: 'Escape' });
    await tick();
    expect(shareModal?.classList.contains('is-visible')).toBe(false);
    expect(shareModal?.getAttribute('aria-hidden')).toBe('true');
  });

  it('copies the share URL and resets copy feedback from Svelte state', async () => {
    vi.useFakeTimers();
    const originalExecCommand = document.execCommand;
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand
    });

    try {
      const { container } = render(DocumentModals);
      const copyButton = container.querySelector<HTMLButtonElement>('#share-copy-btn');
      const copyIcon = copyButton?.querySelector('i');

      modalState.replace({
        activeModalId: 'share-modal',
        shareOpen: true,
        shareUrl: 'https://example.com/share/token',
        shareCopyDisabled: false,
        shareCopySucceeded: false
      });
      await tick();

      await fireEvent.click(copyButton as HTMLButtonElement);
      await tick();

      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(copyIcon?.classList.contains('bi-check-lg')).toBe(true);
      expect(copyIcon?.classList.contains('bi-clipboard')).toBe(false);

      await vi.advanceTimersByTimeAsync(2000);
      await tick();

      expect(copyIcon?.classList.contains('bi-check-lg')).toBe(false);
      expect(copyIcon?.classList.contains('bi-clipboard')).toBe(true);
    } finally {
      if (originalExecCommand) {
        Object.defineProperty(document, 'execCommand', {
          configurable: true,
          value: originalExecCommand
        });
      } else {
        delete (document as unknown as { execCommand?: unknown }).execCommand;
      }
      vi.useRealTimers();
    }
  });
});
