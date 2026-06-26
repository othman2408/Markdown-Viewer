// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  attachDocumentModalControls,
  openAboutDocumentModal,
  openDocumentModal
} from '../../../lib/modals/documentModalControls';

describe('document modal controls', () => {
  it('wires clear-formatting, help, and about close controls', () => {
    document.body.innerHTML = `
      <div id="clear-formatting-modal"></div>
      <button id="clear-formatting-confirm"></button>
      <button id="clear-formatting-cancel"></button>
      <button id="clear-formatting-close"></button>
      <div id="help-modal"></div>
      <button id="help-modal-close"></button>
      <button id="help-modal-close-icon"></button>
      <div id="about-modal"></div>
      <button id="about-modal-close"></button>
      <button id="about-modal-close-icon"></button>
    `;
    const clearFormattingModal = document.getElementById('clear-formatting-modal') as HTMLDivElement;
    const helpModal = document.getElementById('help-modal') as HTMLDivElement;
    const aboutModal = document.getElementById('about-modal') as HTMLDivElement;
    const handlers = {
      applyClearFormatting: vi.fn(),
      closeAppModal: vi.fn()
    };

    attachDocumentModalControls({
      aboutModal,
      aboutModalClose: document.getElementById('about-modal-close'),
      aboutModalCloseIcon: document.getElementById('about-modal-close-icon'),
      clearFormattingCancel: document.getElementById('clear-formatting-cancel'),
      clearFormattingClose: document.getElementById('clear-formatting-close'),
      clearFormattingConfirm: document.getElementById('clear-formatting-confirm'),
      clearFormattingModal,
      helpModal,
      helpModalClose: document.getElementById('help-modal-close'),
      helpModalCloseIcon: document.getElementById('help-modal-close-icon')
    }, handlers);

    document.getElementById('clear-formatting-confirm')?.click();
    document.getElementById('clear-formatting-cancel')?.click();
    document.getElementById('help-modal-close-icon')?.click();
    document.getElementById('about-modal-close')?.click();

    expect(handlers.applyClearFormatting).toHaveBeenCalledOnce();
    expect(handlers.closeAppModal).toHaveBeenNthCalledWith(1, clearFormattingModal);
    expect(handlers.closeAppModal).toHaveBeenNthCalledWith(2, clearFormattingModal);
    expect(handlers.closeAppModal).toHaveBeenNthCalledWith(3, helpModal);
    expect(handlers.closeAppModal).toHaveBeenNthCalledWith(4, aboutModal);
  });

  it('opens document modals and stamps the about version', () => {
    const helpModal = document.createElement('div');
    const aboutModal = document.createElement('div');
    const versionElement = document.createElement('span');
    const openAppModal = vi.fn();

    expect(openDocumentModal(null, openAppModal)).toBe(false);
    expect(openDocumentModal(helpModal, openAppModal)).toBe(true);
    expect(openAboutDocumentModal({
      modal: aboutModal,
      openAppModal,
      version: '9.1.0',
      versionElement
    })).toBe(true);

    expect(openAppModal).toHaveBeenNthCalledWith(1, helpModal);
    expect(openAppModal).toHaveBeenNthCalledWith(2, aboutModal);
    expect(versionElement.textContent).toBe('9.1.0');
  });
});
