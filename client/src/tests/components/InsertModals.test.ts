// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import InsertModals from '../../components/modals/InsertModals.svelte';

const MODAL_IDS = [
  'link-modal',
  'reference-modal',
  'image-modal',
  'table-modal',
  'emoji-modal',
  'symbols-modal',
  'alert-modal'
];

describe('InsertModals', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps insert modal stable IDs, roles, and hidden defaults stable', () => {
    const { container } = render(InsertModals);

    for (const id of MODAL_IDS) {
      const modal = container.querySelector<HTMLDivElement>(`#${id}`);
      expect(modal).not.toBeNull();
      expect(modal?.classList.contains('reset-modal-overlay')).toBe(true);
      expect(modal?.getAttribute('role')).toBe('dialog');
      expect(modal?.getAttribute('aria-modal')).toBe('true');
      expect(modal?.getAttribute('aria-hidden')).toBe('true');
      expect(modal?.getAttribute('style')).toContain('display:none');
    }
  });

  it('keeps insert modal fields and actions addressable', () => {
    const { container } = render(InsertModals);

    expect(container.querySelector<HTMLInputElement>('#link-modal-url')?.value).toBe('https://');
    expect(container.querySelector<HTMLInputElement>('#reference-modal-number')?.value).toBe('[1]');
    expect(container.querySelector<HTMLInputElement>('#image-source-url')?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>('#table-modal-columns')?.value).toBe('3');
    expect(container.querySelector<HTMLInputElement>('#table-modal-rows')?.value).toBe('1');
    expect(container.querySelector('#emoji-modal-grid')?.getAttribute('role')).toBe('listbox');
    expect(container.querySelector('#symbols-modal-grid')?.getAttribute('role')).toBe('listbox');
    expect(container.querySelector('#alert-modal-grid')?.getAttribute('role')).toBe('listbox');
    expect(container.querySelector('#image-modal-insert')?.textContent).toBe('Insert');
    expect(container.querySelector('#alert-modal-insert')?.textContent).toBe('Insert');
  });
});
