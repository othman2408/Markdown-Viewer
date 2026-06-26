// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  SYMBOL_SECTIONS,
  openInsertSymbolsModal
} from '../../../lib/modals/insertSymbolsModal';

function setSymbolsModalDom(): void {
  document.body.innerHTML = `
    <div id="symbols-modal" style="display:none">
      <input id="symbols-modal-search" />
      <div id="symbols-modal-grid"></div>
      <p id="symbols-modal-empty" style="display:none"></p>
      <button id="symbols-modal-insert">Insert</button>
      <button id="symbols-modal-cancel">Cancel</button>
    </div>
  `;
}

function immediateFrame(callback: FrameRequestCallback): number {
  callback(0);
  return 1;
}

function getSymbolItem(entity: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('.symbol-item'))
    .find((item) => item.dataset.entity === entity) ?? null;
}

describe('insert symbols modal helper', () => {
  it('renders all symbol sections and starts with no selection', () => {
    setSymbolsModalDom();
    const modal = document.getElementById('symbols-modal') as HTMLDivElement;
    const searchInput = document.getElementById('symbols-modal-search') as HTMLInputElement;
    const grid = document.getElementById('symbols-modal-grid') as HTMLDivElement;
    const confirmButton = document.getElementById('symbols-modal-insert') as HTMLButtonElement;
    const insertRange = vi.fn();

    expect(openInsertSymbolsModal({
      copyText: vi.fn(),
      documentRef: document,
      flashCopyButton: vi.fn(),
      replaceRange: insertRange,
      requestFrame: immediateFrame,
      selectionEnd: 7,
      selectionStart: 2
    })).toBe(true);

    expect(modal.style.display).toBe('flex');
    expect(searchInput.value).toBe('');
    expect(document.activeElement).toBe(searchInput);
    expect(confirmButton.disabled).toBe(true);
    expect(grid.querySelectorAll('.symbol-section')).toHaveLength(SYMBOL_SECTIONS.length);
    expect(grid.querySelectorAll('.symbol-item')).toHaveLength(47);
    expect(getSymbolItem('&copy;')?.querySelector<HTMLElement>('.symbol-preview')?.textContent).toBe('©');
    expect(insertRange).not.toHaveBeenCalled();
  });

  it('filters visible symbols and shows the empty message when no items match', () => {
    setSymbolsModalDom();
    const searchInput = document.getElementById('symbols-modal-search') as HTMLInputElement;
    const emptyMessage = document.getElementById('symbols-modal-empty') as HTMLParagraphElement;

    openInsertSymbolsModal({
      copyText: vi.fn(),
      documentRef: document,
      flashCopyButton: vi.fn(),
      replaceRange: vi.fn(),
      requestFrame: immediateFrame,
      selectionEnd: 0,
      selectionStart: 0
    });

    searchInput.value = 'euro';
    searchInput.dispatchEvent(new Event('input'));
    expect(emptyMessage.style.display).toBe('none');
    expect(getSymbolItem('&euro;')?.style.display).toBe('');
    expect(getSymbolItem('&copy;')?.style.display).toBe('none');

    searchInput.value = 'not-a-symbol-query';
    searchInput.dispatchEvent(new Event('input'));
    expect(emptyMessage.style.display).toBe('block');
  });

  it('inserts selected symbols in definition order and cleans up listeners', () => {
    setSymbolsModalDom();
    const modal = document.getElementById('symbols-modal') as HTMLDivElement;
    const confirmButton = document.getElementById('symbols-modal-insert') as HTMLButtonElement;
    const insertRange = vi.fn();

    openInsertSymbolsModal({
      copyText: vi.fn(),
      documentRef: document,
      flashCopyButton: vi.fn(),
      replaceRange: insertRange,
      requestFrame: immediateFrame,
      selectionEnd: 9,
      selectionStart: 3
    });

    getSymbolItem('&reg;')?.click();
    getSymbolItem('&copy;')?.click();
    expect(confirmButton.disabled).toBe(false);
    expect(getSymbolItem('&copy;')?.classList.contains('is-selected')).toBe(true);
    expect(getSymbolItem('&copy;')?.getAttribute('aria-pressed')).toBe('true');

    confirmButton.click();

    expect(modal.style.display).toBe('none');
    expect(insertRange).toHaveBeenCalledWith({
      start: 3,
      end: 9,
      replacement: '&copy; &reg;',
      selectionStart: 15,
      selectionEnd: 15
    });

    confirmButton.click();
    expect(insertRange).toHaveBeenCalledOnce();
  });

  it('copies a symbol entity without toggling selection', async () => {
    setSymbolsModalDom();
    const copyText = vi.fn(() => Promise.resolve());
    const flashCopyButton = vi.fn();
    const insertRange = vi.fn();

    openInsertSymbolsModal({
      copyText,
      documentRef: document,
      flashCopyButton,
      replaceRange: insertRange,
      requestFrame: immediateFrame,
      selectionEnd: 0,
      selectionStart: 0
    });

    const copyButton = getSymbolItem('&copy;')?.querySelector<HTMLButtonElement>('.symbol-copy-btn');
    copyButton?.click();
    await Promise.resolve();

    expect(copyText).toHaveBeenCalledWith('&copy;');
    expect(flashCopyButton).toHaveBeenCalledWith(copyButton);
    expect(getSymbolItem('&copy;')?.classList.contains('is-selected')).toBe(false);
    expect(insertRange).not.toHaveBeenCalled();
  });

  it('closes on Escape and Cancel without insertion', () => {
    setSymbolsModalDom();
    const modal = document.getElementById('symbols-modal') as HTMLDivElement;
    const searchInput = document.getElementById('symbols-modal-search') as HTMLInputElement;
    const insertRange = vi.fn();

    openInsertSymbolsModal({
      copyText: vi.fn(),
      documentRef: document,
      flashCopyButton: vi.fn(),
      replaceRange: insertRange,
      requestFrame: immediateFrame,
      selectionEnd: 0,
      selectionStart: 0
    });
    searchInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    expect(modal.style.display).toBe('none');

    openInsertSymbolsModal({
      copyText: vi.fn(),
      documentRef: document,
      flashCopyButton: vi.fn(),
      replaceRange: insertRange,
      requestFrame: immediateFrame,
      selectionEnd: 0,
      selectionStart: 0
    });
    document.getElementById('symbols-modal-cancel')?.click();
    expect(modal.style.display).toBe('none');
    expect(insertRange).not.toHaveBeenCalled();
  });

  it('returns false when required elements are missing', () => {
    document.body.innerHTML = '<div id="symbols-modal"></div>';

    expect(openInsertSymbolsModal({
      copyText: vi.fn(),
      documentRef: document,
      flashCopyButton: vi.fn(),
      replaceRange: vi.fn(),
      requestFrame: immediateFrame,
      selectionEnd: 0,
      selectionStart: 0
    })).toBe(false);
  });
});
