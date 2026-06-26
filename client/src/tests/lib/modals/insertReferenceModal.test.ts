// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  getReferenceSuggestion,
  openInsertReferenceModal,
  prepareReferenceInsertion
} from '../../../lib/modals/insertReferenceModal';

function setReferenceModalDom(): void {
  document.body.innerHTML = `
    <div id="reference-modal" style="display:none">
      <input id="reference-modal-number" />
      <input id="reference-modal-url" />
      <input id="reference-modal-title-input" />
      <button id="reference-modal-apply">Insert</button>
      <button id="reference-modal-cancel">Cancel</button>
    </div>
  `;
}

function immediateFrame(callback: FrameRequestCallback): number {
  callback(0);
  return 1;
}

describe('insert reference modal helper', () => {
  it('suggests the next available reference number from existing definitions', () => {
    expect(getReferenceSuggestion('[1]: https://a.test\n[3]: https://c.test', 1)).toEqual({
      referenceCounter: 4,
      suggestedNumber: 4
    });
    expect(getReferenceSuggestion('Plain text', 7)).toEqual({
      referenceCounter: 7,
      suggestedNumber: 7
    });
  });

  it('prepares reference insertion with title escaping and newline separator', () => {
    expect(prepareReferenceInsertion({
      numberText: '[1]',
      selectionStart: 5,
      selectionEnd: 9,
      suggestedNumber: 1,
      title: 'A "quoted" title',
      url: ' https://example.com/ref ',
      value: 'Read docs'
    })).toEqual({
      caret: 12,
      finalNumber: 1,
      updatedValue: 'Read docs[1]\n[1]: https://example.com/ref "A \\"quoted\\" title"'
    });

    expect(prepareReferenceInsertion({
      numberText: '1',
      selectionStart: 0,
      selectionEnd: 0,
      suggestedNumber: 1,
      title: '',
      url: '',
      value: '[1]: https://already.test\n'
    })).toEqual({
      caret: 3,
      finalNumber: 2,
      updatedValue: '[2][1]: https://already.test\n[2]: https://'
    });
  });

  it('opens, focuses, and applies the reference insertion', () => {
    setReferenceModalDom();
    let markdownValue = 'Read docs';
    const modal = document.getElementById('reference-modal') as HTMLDivElement;
    const numberInput = document.getElementById('reference-modal-number') as HTMLInputElement;
    const urlInput = document.getElementById('reference-modal-url') as HTMLInputElement;
    const titleInput = document.getElementById('reference-modal-title-input') as HTMLInputElement;
    const selectSpy = vi.spyOn(numberInput, 'select');
    const applyReference = vi.fn((input) => {
      markdownValue = input.updatedValue;
    });

    expect(openInsertReferenceModal({
      applyReference,
      documentRef: document,
      getMarkdownValue: () => markdownValue,
      referenceCounter: 1,
      requestFrame: immediateFrame,
      selectionStart: 5,
      selectionEnd: 9
    })).toEqual({
      referenceCounter: 1,
      suggestedNumber: 1
    });

    expect(modal.style.display).toBe('flex');
    expect(numberInput.value).toBe('[1]');
    expect(urlInput.value).toBe('https://');
    expect(titleInput.value).toBe('');
    expect(document.activeElement).toBe(numberInput);
    expect(selectSpy).toHaveBeenCalledOnce();

    urlInput.value = 'https://example.com';
    titleInput.value = 'Docs';
    document.getElementById('reference-modal-apply')?.click();

    expect(modal.style.display).toBe('none');
    expect(applyReference).toHaveBeenCalledWith({
      caret: 12,
      finalNumber: 1,
      updatedValue: 'Read docs[1]\n[1]: https://example.com "Docs"'
    });
    expect(markdownValue).toBe('Read docs[1]\n[1]: https://example.com "Docs"');

    document.getElementById('reference-modal-apply')?.click();
    expect(applyReference).toHaveBeenCalledOnce();
  });

  it('submits on Enter and cancels on Escape', () => {
    setReferenceModalDom();
    const modal = document.getElementById('reference-modal') as HTMLDivElement;
    const titleInput = document.getElementById('reference-modal-title-input') as HTMLInputElement;
    const applyReference = vi.fn();

    openInsertReferenceModal({
      applyReference,
      documentRef: document,
      getMarkdownValue: () => 'Alpha',
      referenceCounter: 1,
      requestFrame: immediateFrame,
      selectionStart: 0,
      selectionEnd: 5
    });
    titleInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter'
    }));
    expect(applyReference).toHaveBeenCalledWith(expect.objectContaining({
      finalNumber: 1,
      updatedValue: 'Alpha[1]\n[1]: https://'
    }));
    expect(modal.style.display).toBe('none');

    openInsertReferenceModal({
      applyReference,
      documentRef: document,
      getMarkdownValue: () => 'Beta',
      referenceCounter: 1,
      requestFrame: immediateFrame,
      selectionStart: 0,
      selectionEnd: 4
    });
    expect(modal.style.display).toBe('flex');
    titleInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    expect(modal.style.display).toBe('none');
    expect(applyReference).toHaveBeenCalledTimes(1);
  });

  it('returns null when required modal elements are missing', () => {
    document.body.innerHTML = '<div id="reference-modal"></div>';

    expect(openInsertReferenceModal({
      applyReference: vi.fn(),
      documentRef: document,
      getMarkdownValue: () => '',
      referenceCounter: 1,
      requestFrame: immediateFrame,
      selectionStart: 0,
      selectionEnd: 0
    })).toBeNull();
  });
});
