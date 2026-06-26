// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  buildMarkdownLink,
  openInsertLinkModal
} from '../../../lib/modals/insertLinkModal';

function setLinkModalDom(): void {
  document.body.innerHTML = `
    <div id="link-modal" style="display:none">
      <input id="link-modal-url" />
      <input id="link-modal-text" />
      <button id="link-modal-apply">Apply</button>
      <button id="link-modal-cancel">Cancel</button>
    </div>
  `;
}

function immediateFrame(callback: FrameRequestCallback): number {
  callback(0);
  return 1;
}

describe('insert link modal helper', () => {
  it('builds markdown links with default values', () => {
    expect(buildMarkdownLink({
      selectedText: 'Selected',
      text: '',
      url: ''
    })).toBe('[Selected](https://)');
    expect(buildMarkdownLink({
      selectedText: '',
      text: '',
      url: ' https://example.com '
    })).toBe('[link text](https://example.com)');
    expect(buildMarkdownLink({
      selectedText: 'old',
      text: ' Docs ',
      url: ' mailto:test@example.com '
    })).toBe('[Docs](mailto:test@example.com)');
  });

  it('opens, focuses, and applies the link replacement', () => {
    setLinkModalDom();
    const modal = document.getElementById('link-modal') as HTMLDivElement;
    const urlInput = document.getElementById('link-modal-url') as HTMLInputElement;
    const textInput = document.getElementById('link-modal-text') as HTMLInputElement;
    const selectSpy = vi.spyOn(urlInput, 'select');
    const replaceRange = vi.fn();

    expect(openInsertLinkModal({
      documentRef: document,
      requestFrame: immediateFrame,
      replaceRange,
      selectedText: 'Codex',
      selectionEnd: 12,
      selectionStart: 7
    })).toBe(true);

    expect(modal.style.display).toBe('flex');
    expect(urlInput.value).toBe('https://');
    expect(textInput.value).toBe('Codex');
    expect(document.activeElement).toBe(urlInput);
    expect(selectSpy).toHaveBeenCalledOnce();

    urlInput.value = 'https://example.com';
    textInput.value = 'Example';
    document.getElementById('link-modal-apply')?.click();

    expect(modal.style.display).toBe('none');
    expect(replaceRange).toHaveBeenCalledWith({
      start: 7,
      end: 12,
      replacement: '[Example](https://example.com)',
      selectionStart: 37,
      selectionEnd: 37
    });

    document.getElementById('link-modal-apply')?.click();
    expect(replaceRange).toHaveBeenCalledOnce();
  });

  it('submits on Enter and cancels on Escape', () => {
    setLinkModalDom();
    const modal = document.getElementById('link-modal') as HTMLDivElement;
    const textInput = document.getElementById('link-modal-text') as HTMLInputElement;
    const replaceRange = vi.fn();

    openInsertLinkModal({
      documentRef: document,
      requestFrame: immediateFrame,
      replaceRange,
      selectedText: '',
      selectionEnd: 0,
      selectionStart: 0
    });
    textInput.value = 'Keyboard';
    textInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter'
    }));

    expect(replaceRange).toHaveBeenCalledWith(expect.objectContaining({
      replacement: '[Keyboard](https://)'
    }));
    expect(modal.style.display).toBe('none');

    openInsertLinkModal({
      documentRef: document,
      requestFrame: immediateFrame,
      replaceRange,
      selectedText: 'Cancel',
      selectionEnd: 6,
      selectionStart: 0
    });
    expect(modal.style.display).toBe('flex');
    textInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));

    expect(modal.style.display).toBe('none');
    expect(replaceRange).toHaveBeenCalledTimes(1);
  });

  it('returns false when required modal elements are missing', () => {
    document.body.innerHTML = '<div id="link-modal"></div>';

    expect(openInsertLinkModal({
      documentRef: document,
      requestFrame: immediateFrame,
      replaceRange: vi.fn(),
      selectedText: '',
      selectionEnd: 0,
      selectionStart: 0
    })).toBe(false);
  });
});
