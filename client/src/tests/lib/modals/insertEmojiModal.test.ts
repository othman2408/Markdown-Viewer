// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import type { EmojiEntry, OpenInsertEmojiModalOptions } from '../../../lib/modals/insertEmojiModal';
import { openInsertEmojiModal } from '../../../lib/modals/insertEmojiModal';

const entries: EmojiEntry[] = [
  {
    name: 'alpha',
    search: 'alpha :alpha:',
    shortcode: ':alpha:',
    url: 'https://example.test/alpha.png'
  },
  {
    name: 'beta',
    search: 'beta :beta:',
    shortcode: ':beta:',
    url: 'https://example.test/beta.png'
  },
  {
    name: 'heart',
    search: 'heart :heart:',
    shortcode: ':heart:',
    url: 'https://example.test/heart.png'
  }
];

function setEmojiModalDom(): void {
  document.body.innerHTML = `
    <div id="emoji-modal" style="display:none">
      <input id="emoji-modal-search" />
      <div id="emoji-modal-grid"></div>
      <p id="emoji-modal-empty" style="display:none"></p>
      <button id="emoji-modal-insert">Insert</button>
      <button id="emoji-modal-cancel">Cancel</button>
    </div>
  `;
}

function immediateFrame(callback: FrameRequestCallback): number {
  callback(0);
  return 1;
}

function getEmojiItem(shortcode: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('.emoji-item'))
    .find((item) => item.dataset.shortcode === shortcode) ?? null;
}

function openEmojiModal(overrides: Partial<OpenInsertEmojiModalOptions> = {}): boolean {
  return openInsertEmojiModal({
    announce: vi.fn(),
    copyText: vi.fn(() => Promise.resolve()),
    documentRef: document,
    flashCopyButton: vi.fn(),
    hasLookupLoaded: true,
    loadEntries: vi.fn(() => Promise.resolve(entries)),
    replaceRange: vi.fn(),
    requestFrame: immediateFrame,
    selectionEnd: 0,
    selectionStart: 0,
    ...overrides
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('insert emoji modal helper', () => {
  it('opens with loading state, focus, and skeletons while lookup is pending', () => {
    setEmojiModalDom();
    const modal = document.getElementById('emoji-modal') as HTMLDivElement;
    const searchInput = document.getElementById('emoji-modal-search') as HTMLInputElement;
    const emptyMessage = document.getElementById('emoji-modal-empty') as HTMLParagraphElement;
    const confirmButton = document.getElementById('emoji-modal-insert') as HTMLButtonElement;
    const announce = vi.fn();

    expect(openEmojiModal({
      announce,
      hasLookupLoaded: false,
      loadEntries: vi.fn(() => new Promise<EmojiEntry[]>(() => {}))
    })).toBe(true);

    expect(modal.style.display).toBe('flex');
    expect(document.activeElement).toBe(searchInput);
    expect(confirmButton.disabled).toBe(true);
    expect(searchInput.value).toBe('');
    expect(emptyMessage.textContent).toBe('Loading emojis...');
    expect(emptyMessage.style.display).toBe('block');
    expect(document.querySelectorAll('.emoji-item.skeleton-placeholder')).toHaveLength(18);
    expect(announce).toHaveBeenCalledWith('Loading emojis...');
  });

  it('renders loaded emoji entries and copies a shortcode without selecting it', async () => {
    setEmojiModalDom();
    const emptyMessage = document.getElementById('emoji-modal-empty') as HTMLParagraphElement;
    const confirmButton = document.getElementById('emoji-modal-insert') as HTMLButtonElement;
    const announce = vi.fn();
    const copyText = vi.fn(() => Promise.resolve());
    const flashCopyButton = vi.fn();
    const replaceRange = vi.fn();

    openEmojiModal({
      announce,
      copyText,
      flashCopyButton,
      replaceRange
    });
    await flushPromises();

    expect(document.querySelectorAll('.emoji-item')).toHaveLength(entries.length);
    expect(emptyMessage.textContent).toBe('No emojis found.');
    expect(emptyMessage.style.display).toBe('none');
    expect(confirmButton.disabled).toBe(true);
    expect(getEmojiItem(':alpha:')?.querySelector('img')?.getAttribute('alt')).toBe(':alpha:');
    expect(announce).toHaveBeenCalledWith('Emojis loaded. 3 items available.');

    const copyButton = getEmojiItem(':alpha:')?.querySelector<HTMLButtonElement>('.emoji-copy-btn');
    copyButton?.click();
    await flushPromises();

    expect(copyText).toHaveBeenCalledWith(':alpha:');
    expect(flashCopyButton).toHaveBeenCalledWith(copyButton);
    expect(getEmojiItem(':alpha:')?.classList.contains('is-selected')).toBe(false);
    expect(replaceRange).not.toHaveBeenCalled();
  });

  it('filters visible emojis and shows the empty message when no entries match', async () => {
    setEmojiModalDom();
    const searchInput = document.getElementById('emoji-modal-search') as HTMLInputElement;
    const emptyMessage = document.getElementById('emoji-modal-empty') as HTMLParagraphElement;

    openEmojiModal();
    await flushPromises();

    searchInput.value = 'heart';
    searchInput.dispatchEvent(new Event('input'));
    expect(emptyMessage.style.display).toBe('none');
    expect(document.querySelectorAll('.emoji-item')).toHaveLength(1);
    expect(getEmojiItem(':heart:')).not.toBeNull();

    searchInput.value = 'missing';
    searchInput.dispatchEvent(new Event('input'));
    expect(emptyMessage.style.display).toBe('block');
    expect(document.querySelectorAll('.emoji-item')).toHaveLength(0);
  });

  it('renders additional chunks on scroll', async () => {
    setEmojiModalDom();
    const grid = document.getElementById('emoji-modal-grid') as HTMLDivElement;

    openEmojiModal({
      chunkSize: 2
    });
    await flushPromises();

    expect(document.querySelectorAll('.emoji-item')).toHaveLength(2);
    Object.defineProperty(grid, 'clientHeight', { configurable: true, value: 100 });
    Object.defineProperty(grid, 'scrollHeight', { configurable: true, value: 150 });
    grid.scrollTop = 100;
    grid.dispatchEvent(new Event('scroll'));

    expect(document.querySelectorAll('.emoji-item')).toHaveLength(3);
  });

  it('inserts selected emojis in rendered order and cleans up listeners', async () => {
    setEmojiModalDom();
    const modal = document.getElementById('emoji-modal') as HTMLDivElement;
    const confirmButton = document.getElementById('emoji-modal-insert') as HTMLButtonElement;
    const replaceRange = vi.fn();

    openEmojiModal({
      replaceRange,
      selectionEnd: 8,
      selectionStart: 2
    });
    await flushPromises();

    getEmojiItem(':beta:')?.click();
    getEmojiItem(':alpha:')?.click();
    expect(confirmButton.disabled).toBe(false);
    expect(getEmojiItem(':alpha:')?.classList.contains('is-selected')).toBe(true);
    expect(getEmojiItem(':alpha:')?.getAttribute('aria-pressed')).toBe('true');

    confirmButton.click();

    expect(modal.style.display).toBe('none');
    expect(replaceRange).toHaveBeenCalledWith({
      start: 2,
      end: 8,
      replacement: ':alpha: :beta:',
      selectionStart: 16,
      selectionEnd: 16
    });

    confirmButton.click();
    expect(replaceRange).toHaveBeenCalledOnce();
  });

  it('closes on Escape and Cancel without insertion', async () => {
    setEmojiModalDom();
    const modal = document.getElementById('emoji-modal') as HTMLDivElement;
    const searchInput = document.getElementById('emoji-modal-search') as HTMLInputElement;
    const replaceRange = vi.fn();

    openEmojiModal({
      replaceRange
    });
    await flushPromises();
    searchInput.dispatchEvent(new KeyboardEvent('keydown', {
      bubbles: true,
      key: 'Escape'
    }));
    expect(modal.style.display).toBe('none');

    openEmojiModal({
      replaceRange
    });
    await flushPromises();
    document.getElementById('emoji-modal-cancel')?.click();
    expect(modal.style.display).toBe('none');
    expect(replaceRange).not.toHaveBeenCalled();
  });

  it('shows a load failure when the loader returns no entries', async () => {
    setEmojiModalDom();
    const emptyMessage = document.getElementById('emoji-modal-empty') as HTMLParagraphElement;
    const announce = vi.fn();

    openEmojiModal({
      announce,
      hasLookupLoaded: false,
      loadEntries: vi.fn(() => Promise.resolve([]))
    });
    await flushPromises();

    expect(emptyMessage.textContent).toBe('Unable to load emojis.');
    expect(emptyMessage.style.display).toBe('block');
    expect(document.querySelectorAll('.emoji-item')).toHaveLength(0);
    expect(announce).toHaveBeenCalledWith('Failed to load emojis.');
  });

  it('returns false when required elements are missing', () => {
    document.body.innerHTML = '<div id="emoji-modal"></div>';

    expect(openEmojiModal()).toBe(false);
  });
});
