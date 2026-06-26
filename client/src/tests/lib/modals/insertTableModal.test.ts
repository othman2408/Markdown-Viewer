// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  buildClampedMarkdownTable,
  openInsertTableModal
} from '../../../lib/modals/insertTableModal';

function setTableModalDom(): void {
  document.body.innerHTML = `
    <div id="table-modal" style="display:none">
      <input id="table-modal-columns" />
      <input id="table-modal-rows" />
      <button id="table-modal-insert">Insert</button>
      <button id="table-modal-cancel">Cancel</button>
    </div>
  `;
}

function immediateFrame(callback: FrameRequestCallback): number {
  callback(0);
  return 1;
}

describe('insert table modal helper', () => {
  it('builds clamped markdown table content', () => {
    expect(buildClampedMarkdownTable({
      columns: '2',
      rows: '2'
    })).toBe('| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n| Value | Value |\n');
    expect(buildClampedMarkdownTable({
      columns: '99',
      rows: 'bad'
    }).startsWith('| Column 1 | Column 2 | Column 3 |')).toBe(true);
  });

  it('opens, focuses, and inserts the selected table shape', () => {
    setTableModalDom();
    const modal = document.getElementById('table-modal') as HTMLDivElement;
    const columnInput = document.getElementById('table-modal-columns') as HTMLInputElement;
    const rowInput = document.getElementById('table-modal-rows') as HTMLInputElement;
    const selectSpy = vi.spyOn(columnInput, 'select');
    const insertBlock = vi.fn();

    expect(openInsertTableModal({
      documentRef: document,
      insertBlock,
      requestFrame: immediateFrame,
      selectionStart: 4,
      selectionEnd: 9
    })).toBe(true);

    expect(modal.style.display).toBe('flex');
    expect(columnInput.value).toBe('3');
    expect(rowInput.value).toBe('1');
    expect(document.activeElement).toBe(columnInput);
    expect(selectSpy).toHaveBeenCalledOnce();

    columnInput.value = '2';
    rowInput.value = '1';
    document.getElementById('table-modal-insert')?.click();

    expect(modal.style.display).toBe('none');
    expect(insertBlock).toHaveBeenCalledWith({
      start: 4,
      end: 9,
      block: '| Column 1 | Column 2 |\n| --- | --- |\n| Value | Value |\n'
    });

    document.getElementById('table-modal-insert')?.click();
    expect(insertBlock).toHaveBeenCalledOnce();
  });

  it('submits on Enter and cancels on Escape', () => {
    setTableModalDom();
    const modal = document.getElementById('table-modal') as HTMLDivElement;
    const rowInput = document.getElementById('table-modal-rows') as HTMLInputElement;
    const insertBlock = vi.fn();

    openInsertTableModal({
      documentRef: document,
      insertBlock,
      requestFrame: immediateFrame,
      selectionStart: 0,
      selectionEnd: 0
    });
    rowInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Enter'
    }));
    expect(insertBlock).toHaveBeenCalledOnce();
    expect(modal.style.display).toBe('none');

    openInsertTableModal({
      documentRef: document,
      insertBlock,
      requestFrame: immediateFrame,
      selectionStart: 0,
      selectionEnd: 0
    });
    expect(modal.style.display).toBe('flex');
    rowInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    expect(modal.style.display).toBe('none');
    expect(insertBlock).toHaveBeenCalledOnce();
  });

  it('returns false when required modal elements are missing', () => {
    document.body.innerHTML = '<div id="table-modal"></div>';

    expect(openInsertTableModal({
      documentRef: document,
      insertBlock: vi.fn(),
      requestFrame: immediateFrame,
      selectionStart: 0,
      selectionEnd: 0
    })).toBe(false);
  });
});
