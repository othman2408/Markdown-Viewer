export interface EmojiEntry {
  name: string;
  search: string;
  shortcode: string;
  url: string;
}

export interface OpenInsertEmojiModalOptions {
  announce(message: string): void;
  chunkSize?: number;
  consoleRef?: Pick<Console, 'error'>;
  copyText(text: string): Promise<unknown>;
  documentRef?: Document;
  flashCopyButton(button: HTMLElement): void;
  hasLookupLoaded: boolean;
  loadEntries(): Promise<EmojiEntry[]>;
  replaceRange(input: {
    end: number;
    replacement: string;
    selectionEnd: number;
    selectionStart: number;
    start: number;
  }): void;
  requestFrame?: (callback: FrameRequestCallback) => number;
  selectionEnd: number;
  selectionStart: number;
}

export interface InsertEmojiModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLButtonElement;
  emptyMessage: HTMLElement;
  grid: HTMLElement;
  modal: HTMLElement;
  searchInput: HTMLInputElement;
}

interface RenderedEmojiItem {
  element: HTMLElement;
  search: string;
  shortcode: string;
}

const DEFAULT_CHUNK_SIZE = 120;
const SKELETON_COUNT = 18;

export function getInsertEmojiModalElements(documentRef: Document): InsertEmojiModalElements | null {
  const modal = documentRef.getElementById('emoji-modal');
  const grid = documentRef.getElementById('emoji-modal-grid');
  const emptyMessage = documentRef.getElementById('emoji-modal-empty');
  const searchInput = documentRef.getElementById('emoji-modal-search') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('emoji-modal-insert') as HTMLButtonElement | null;
  const cancelButton = documentRef.getElementById('emoji-modal-cancel');

  if (!modal || !grid || !emptyMessage || !searchInput || !confirmButton || !cancelButton) {
    return null;
  }

  return {
    cancelButton,
    confirmButton,
    emptyMessage,
    grid,
    modal,
    searchInput
  };
}

export function renderEmojiSkeletons(documentRef: Document, grid: HTMLElement): void {
  grid.textContent = '';
  const fragment = documentRef.createDocumentFragment();

  for (let index = 0; index < SKELETON_COUNT; index += 1) {
    const item = documentRef.createElement('div');
    item.className = 'emoji-item skeleton-placeholder';
    item.setAttribute('aria-hidden', 'true');
    item.style.border = '1px solid var(--border-color)';
    item.style.borderRadius = '10px';
    item.style.padding = '10px';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'center';
    item.style.gap = '8px';

    const preview = documentRef.createElement('span');
    preview.className = 'emoji-preview skeleton-circle';
    item.appendChild(preview);

    const shortcodeRow = documentRef.createElement('div');
    shortcodeRow.className = 'emoji-shortcode';
    const code = documentRef.createElement('span');
    code.className = 'skeleton-text';
    code.style.width = '60px';
    shortcodeRow.appendChild(code);
    item.appendChild(shortcodeRow);

    fragment.appendChild(item);
  }

  grid.appendChild(fragment);
}

function createEmojiButton(
  documentRef: Document,
  entry: EmojiEntry,
  selection: Set<string>,
  confirmButton: HTMLButtonElement,
  toggleSelection: (shortcode: string, element: HTMLElement) => void,
  options: Pick<OpenInsertEmojiModalOptions, 'consoleRef' | 'copyText' | 'flashCopyButton'>
): RenderedEmojiItem {
  const item = documentRef.createElement('button');
  item.type = 'button';
  item.className = 'emoji-item';

  const isSelected = selection.has(entry.shortcode);
  if (isSelected) {
    item.classList.add('is-selected');
  }
  item.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  item.dataset.search = entry.search;
  item.dataset.shortcode = entry.shortcode;

  const preview = documentRef.createElement('span');
  preview.className = 'emoji-preview';

  const image = documentRef.createElement('img');
  image.src = entry.url;
  image.alt = entry.shortcode;
  image.loading = 'lazy';
  preview.appendChild(image);

  const shortcodeRow = documentRef.createElement('div');
  shortcodeRow.className = 'emoji-shortcode';

  const code = documentRef.createElement('span');
  code.textContent = entry.shortcode;

  const copyButton = documentRef.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'emoji-copy-btn';
  copyButton.setAttribute('aria-label', `Copy ${entry.shortcode}`);
  copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
  copyButton.addEventListener('click', (event) => {
    event.stopPropagation();
    options.copyText(entry.shortcode)
      .then(() => options.flashCopyButton(copyButton))
      .catch((error: unknown) => options.consoleRef?.error('Copy failed:', error));
  });

  shortcodeRow.append(code, copyButton);
  item.append(preview, shortcodeRow);
  item.addEventListener('click', () => toggleSelection(entry.shortcode, item));

  confirmButton.disabled = selection.size === 0;

  return {
    element: item,
    search: entry.search,
    shortcode: entry.shortcode
  };
}

export function openInsertEmojiModal(options: OpenInsertEmojiModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const consoleRef = options.consoleRef ?? console;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const elements = getInsertEmojiModalElements(documentRef);
  if (!elements) return false;

  const {
    cancelButton,
    confirmButton,
    emptyMessage,
    grid,
    modal,
    searchInput
  } = elements;
  const selection = new Set<string>();
  let allEntries: EmojiEntry[] = [];
  let currentFilteredEntries: EmojiEntry[] = [];
  let renderedCount = 0;
  let emojiItems: RenderedEmojiItem[] = [];

  function updateInsertState(): void {
    confirmButton.disabled = selection.size === 0;
  }

  function toggleSelection(shortcode: string, element: HTMLElement): void {
    if (selection.has(shortcode)) {
      selection.delete(shortcode);
      element.classList.remove('is-selected');
    } else {
      selection.add(shortcode);
      element.classList.add('is-selected');
    }

    element.setAttribute('aria-pressed', selection.has(shortcode).toString());
    updateInsertState();
  }

  function renderEmojiChunk(clear = false): void {
    if (clear) {
      grid.textContent = '';
      emojiItems = [];
      renderedCount = 0;
    }

    const nextBatch = currentFilteredEntries.slice(renderedCount, renderedCount + chunkSize);
    if (nextBatch.length === 0) {
      emptyMessage.style.display = emojiItems.length ? 'none' : 'block';
      return;
    }

    const fragment = documentRef.createDocumentFragment();
    const newItems = nextBatch.map((entry) => {
      const item = createEmojiButton(
        documentRef,
        entry,
        selection,
        confirmButton,
        toggleSelection,
        {
          consoleRef,
          copyText: options.copyText,
          flashCopyButton: options.flashCopyButton
        }
      );
      fragment.appendChild(item.element);
      return item;
    });

    emojiItems = emojiItems.concat(newItems);
    grid.appendChild(fragment);
    renderedCount += nextBatch.length;
    emptyMessage.style.display = emojiItems.length ? 'none' : 'block';
  }

  function applyFilter(): void {
    const query = searchInput.value.trim().toLowerCase();
    currentFilteredEntries = allEntries.filter((entry) => !query || entry.search.includes(query));
    renderEmojiChunk(true);
  }

  function handleScroll(): void {
    if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 60) {
      renderEmojiChunk(false);
    }
  }

  function cleanup(): void {
    confirmButton.removeEventListener('click', insertEmojis);
    cancelButton.removeEventListener('click', closeModal);
    searchInput.removeEventListener('input', applyFilter);
    searchInput.removeEventListener('keydown', onKey);
    grid.removeEventListener('scroll', handleScroll);
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function insertEmojis(): void {
    if (!selection.size) return;
    const ordered = emojiItems
      .filter((item) => selection.has(item.shortcode))
      .map((item) => item.shortcode);
    const insertion = ordered.join(' ');

    modal.style.display = 'none';
    cleanup();
    options.replaceRange({
      start: options.selectionStart,
      end: options.selectionEnd,
      replacement: insertion,
      selectionStart: options.selectionStart + insertion.length,
      selectionEnd: options.selectionStart + insertion.length
    });
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  function showLoadFailure(): void {
    emptyMessage.textContent = 'Unable to load emojis.';
    emptyMessage.style.display = 'block';
    grid.textContent = '';
    emojiItems = [];
    options.announce('Failed to load emojis.');
  }

  modal.style.display = 'flex';
  confirmButton.disabled = true;
  emptyMessage.textContent = 'Loading emojis...';
  emptyMessage.style.display = 'block';
  options.announce('Loading emojis...');
  searchInput.value = '';
  grid.textContent = '';
  grid.scrollTop = 0;

  if (!options.hasLookupLoaded) {
    renderEmojiSkeletons(documentRef, grid);
  }

  options.loadEntries()
    .then((entries) => {
      if (!entries.length) {
        showLoadFailure();
        return;
      }

      allEntries = entries;
      currentFilteredEntries = entries;
      renderEmojiChunk(true);
      emptyMessage.textContent = 'No emojis found.';
      options.announce(`Emojis loaded. ${entries.length} items available.`);
      updateInsertState();
    })
    .catch((error: unknown) => {
      consoleRef.error('Failed to load emojis:', error);
      showLoadFailure();
    });

  confirmButton.addEventListener('click', insertEmojis);
  cancelButton.addEventListener('click', closeModal);
  searchInput.addEventListener('input', applyFilter);
  searchInput.addEventListener('keydown', onKey);
  grid.addEventListener('scroll', handleScroll);
  requestFrame(() => searchInput.focus());

  return true;
}
