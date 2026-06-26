// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  GITHUB_ALERT_META,
  GITHUB_ALERT_TYPES,
  buildGitHubAlertBlock,
  createMarkdownAlertPreview,
  openInsertAlertModal
} from '../../../lib/modals/insertAlertModal';

function setAlertModalDom(): void {
  document.body.innerHTML = `
    <div id="alert-modal" style="display:none">
      <div id="alert-modal-grid"></div>
      <button id="alert-modal-insert">Insert</button>
      <button id="alert-modal-cancel">Cancel</button>
    </div>
  `;
}

describe('insert alert modal helper', () => {
  it('builds alert blocks and previews from shared metadata', () => {
    expect(GITHUB_ALERT_TYPES).toEqual(['note', 'tip', 'important', 'warning', 'caution']);
    expect(buildGitHubAlertBlock('warning', GITHUB_ALERT_META.warning)).toBe(
      '> [!WARNING]\n> Warning details go here.\n'
    );

    const preview = createMarkdownAlertPreview(document, 'note', GITHUB_ALERT_META.note);
    expect(preview.className).toBe('markdown-alert markdown-alert-note');
    expect(preview.querySelector('.markdown-alert-title')?.textContent).toBe('Note');
    expect(preview.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 512 512');
    expect(preview.querySelector('p:last-child')?.textContent).toBe('Note details go here.');
  });

  it('opens, renders options, selects an alert, and inserts its block', () => {
    setAlertModalDom();
    const modal = document.getElementById('alert-modal') as HTMLDivElement;
    const grid = document.getElementById('alert-modal-grid') as HTMLDivElement;
    const insertBlock = vi.fn();

    expect(openInsertAlertModal({
      documentRef: document,
      insertBlock,
      selectionStart: 2,
      selectionEnd: 8
    })).toBe(true);

    expect(modal.style.display).toBe('flex');
    expect(grid.querySelectorAll('.alert-option')).toHaveLength(5);
    expect(grid.querySelector('.alert-option.is-selected')?.getAttribute('data-alert-type')).toBe('note');

    const warning = grid.querySelector<HTMLButtonElement>('[data-alert-type="warning"]');
    warning?.click();
    expect(warning?.classList.contains('is-selected')).toBe(true);
    expect(warning?.getAttribute('aria-pressed')).toBe('true');
    expect(grid.querySelector<HTMLButtonElement>('[data-alert-type="note"]')?.getAttribute('aria-pressed')).toBe('false');

    document.getElementById('alert-modal-insert')?.click();

    expect(modal.style.display).toBe('none');
    expect(insertBlock).toHaveBeenCalledWith({
      start: 2,
      end: 8,
      block: '> [!WARNING]\n> Warning details go here.\n'
    });

    document.getElementById('alert-modal-insert')?.click();
    expect(insertBlock).toHaveBeenCalledOnce();
  });

  it('closes with Escape and Cancel without inserting', () => {
    setAlertModalDom();
    const modal = document.getElementById('alert-modal') as HTMLDivElement;
    const insertBlock = vi.fn();

    openInsertAlertModal({
      documentRef: document,
      insertBlock,
      selectionStart: 0,
      selectionEnd: 0
    });
    modal.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    expect(modal.style.display).toBe('none');
    expect(insertBlock).not.toHaveBeenCalled();

    openInsertAlertModal({
      documentRef: document,
      insertBlock,
      selectionStart: 0,
      selectionEnd: 0
    });
    document.getElementById('alert-modal-cancel')?.click();
    expect(modal.style.display).toBe('none');
    expect(insertBlock).not.toHaveBeenCalled();
  });

  it('returns false when required elements are missing', () => {
    document.body.innerHTML = '<div id="alert-modal"></div>';

    expect(openInsertAlertModal({
      documentRef: document,
      insertBlock: vi.fn(),
      selectionStart: 0,
      selectionEnd: 0
    })).toBe(false);
  });
});
