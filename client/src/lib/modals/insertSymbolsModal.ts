export interface SymbolEntry {
  entity: string;
  name: string;
  symbol: string;
}

export interface SymbolSection {
  items: SymbolEntry[];
  title: string;
}

export interface OpenInsertSymbolsModalOptions {
  consoleRef?: Pick<Console, 'error'>;
  copyText(text: string): Promise<unknown>;
  documentRef?: Document;
  flashCopyButton(button: HTMLElement): void;
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

export interface InsertSymbolsModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLButtonElement;
  emptyMessage: HTMLElement;
  grid: HTMLElement;
  modal: HTMLElement;
  searchInput: HTMLInputElement;
}

interface RenderedSymbolItem {
  element: HTMLElement;
  entity: string;
  search: string;
}

interface RenderedSymbolSection {
  items: RenderedSymbolItem[];
  wrapper: HTMLElement;
}

export const SYMBOL_SECTIONS: SymbolSection[] = [
  {
    title: 'Common symbols',
    items: [
      { symbol: '©', entity: '&copy;', name: 'copyright' },
      { symbol: '®', entity: '&reg;', name: 'registered' },
      { symbol: '™', entity: '&trade;', name: 'trademark' },
      { symbol: '✓', entity: '&check;', name: 'check' },
      { symbol: '★', entity: '&star;', name: 'star' },
      { symbol: '•', entity: '&bull;', name: 'bullet' },
      { symbol: '…', entity: '&hellip;', name: 'ellipsis' },
      { symbol: '—', entity: '&mdash;', name: 'em dash' },
      { symbol: '–', entity: '&ndash;', name: 'en dash' },
      { symbol: '→', entity: '&rarr;', name: 'right arrow' },
      { symbol: '←', entity: '&larr;', name: 'left arrow' },
      { symbol: '↑', entity: '&uarr;', name: 'up arrow' },
      { symbol: '↓', entity: '&darr;', name: 'down arrow' }
    ]
  },
  {
    title: 'HTML entities',
    items: [
      { symbol: '€', entity: '&euro;', name: 'euro' },
      { symbol: '£', entity: '&pound;', name: 'pound' },
      { symbol: '¥', entity: '&yen;', name: 'yen' },
      { symbol: '§', entity: '&sect;', name: 'section' },
      { symbol: '°', entity: '&deg;', name: 'degree' },
      { symbol: '±', entity: '&plusmn;', name: 'plus minus' },
      { symbol: '×', entity: '&times;', name: 'times' },
      { symbol: '÷', entity: '&divide;', name: 'divide' },
      { symbol: '≠', entity: '&ne;', name: 'not equal' },
      { symbol: '≤', entity: '&le;', name: 'less equal' },
      { symbol: '≥', entity: '&ge;', name: 'greater equal' },
      { symbol: '∞', entity: '&infin;', name: 'infinity' },
      { symbol: 'µ', entity: '&micro;', name: 'micro' },
      { symbol: '¼', entity: '&frac14;', name: 'quarter' },
      { symbol: '½', entity: '&frac12;', name: 'half' },
      { symbol: '¾', entity: '&frac34;', name: 'three quarters' },
      { symbol: '«', entity: '&laquo;', name: 'left quote' },
      { symbol: '»', entity: '&raquo;', name: 'right quote' }
    ]
  },
  {
    title: 'Markdown-safe characters',
    items: [
      { symbol: '&', entity: '&amp;', name: 'ampersand' },
      { symbol: '<', entity: '&lt;', name: 'less than' },
      { symbol: '>', entity: '&gt;', name: 'greater than' },
      { symbol: '"', entity: '&quot;', name: 'double quote' },
      { symbol: "'", entity: '&#39;', name: 'apostrophe' },
      { symbol: '|', entity: '&#124;', name: 'pipe' },
      { symbol: '\\', entity: '&#92;', name: 'backslash' },
      { symbol: '`', entity: '&#96;', name: 'backtick' },
      { symbol: '*', entity: '&#42;', name: 'asterisk' },
      { symbol: '_', entity: '&#95;', name: 'underscore' },
      { symbol: '{', entity: '&#123;', name: 'left brace' },
      { symbol: '}', entity: '&#125;', name: 'right brace' },
      { symbol: '[', entity: '&#91;', name: 'left bracket' },
      { symbol: ']', entity: '&#93;', name: 'right bracket' },
      { symbol: '(', entity: '&#40;', name: 'left parenthesis' },
      { symbol: ')', entity: '&#41;', name: 'right parenthesis' }
    ]
  }
];

export function getInsertSymbolsModalElements(documentRef: Document): InsertSymbolsModalElements | null {
  const modal = documentRef.getElementById('symbols-modal');
  const grid = documentRef.getElementById('symbols-modal-grid');
  const emptyMessage = documentRef.getElementById('symbols-modal-empty');
  const searchInput = documentRef.getElementById('symbols-modal-search') as HTMLInputElement | null;
  const confirmButton = documentRef.getElementById('symbols-modal-insert') as HTMLButtonElement | null;
  const cancelButton = documentRef.getElementById('symbols-modal-cancel');

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

function createSymbolButton(
  documentRef: Document,
  entry: SymbolEntry,
  selection: Set<string>,
  confirmButton: HTMLButtonElement,
  options: Pick<OpenInsertSymbolsModalOptions, 'consoleRef' | 'copyText' | 'flashCopyButton'>
): RenderedSymbolItem {
  const item = documentRef.createElement('button');
  item.type = 'button';
  item.className = 'symbol-item';
  item.setAttribute('aria-pressed', 'false');

  const preview = documentRef.createElement('span');
  preview.className = 'symbol-preview';
  preview.textContent = entry.symbol;

  const codeRow = documentRef.createElement('div');
  codeRow.className = 'symbol-code';

  const code = documentRef.createElement('span');
  code.textContent = entry.entity;

  const copyButton = documentRef.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'symbol-copy-btn';
  copyButton.setAttribute('aria-label', `Copy ${entry.entity}`);
  copyButton.innerHTML = '<i class="bi bi-clipboard"></i>';
  copyButton.addEventListener('click', (event) => {
    event.stopPropagation();
    options.copyText(entry.entity)
      .then(() => options.flashCopyButton(copyButton))
      .catch((error: unknown) => options.consoleRef?.error('Copy failed:', error));
  });

  codeRow.append(code, copyButton);
  item.append(preview, codeRow);
  item.dataset.search = `${entry.symbol} ${entry.entity} ${entry.name}`.toLowerCase();
  item.dataset.entity = entry.entity;
  item.addEventListener('click', () => {
    if (selection.has(entry.entity)) {
      selection.delete(entry.entity);
      item.classList.remove('is-selected');
    } else {
      selection.add(entry.entity);
      item.classList.add('is-selected');
    }
    item.setAttribute('aria-pressed', selection.has(entry.entity).toString());
    confirmButton.disabled = selection.size === 0;
  });

  return {
    element: item,
    entity: entry.entity,
    search: item.dataset.search || ''
  };
}

function renderSymbolSections(
  documentRef: Document,
  grid: HTMLElement,
  selection: Set<string>,
  confirmButton: HTMLButtonElement,
  options: Pick<OpenInsertSymbolsModalOptions, 'consoleRef' | 'copyText' | 'flashCopyButton'>
): RenderedSymbolSection[] {
  const sectionEntries: RenderedSymbolSection[] = [];

  for (const section of SYMBOL_SECTIONS) {
    const sectionWrapper = documentRef.createElement('div');
    sectionWrapper.className = 'symbol-section';

    const title = documentRef.createElement('p');
    title.className = 'symbol-section-title';
    title.textContent = section.title;

    const sectionGrid = documentRef.createElement('div');
    sectionGrid.className = 'symbol-section-grid';

    const items = section.items.map((entry) => {
      const item = createSymbolButton(documentRef, entry, selection, confirmButton, options);
      sectionGrid.appendChild(item.element);
      return item;
    });

    sectionWrapper.append(title, sectionGrid);
    grid.appendChild(sectionWrapper);
    sectionEntries.push({
      wrapper: sectionWrapper,
      items
    });
  }

  return sectionEntries;
}

export function openInsertSymbolsModal(options: OpenInsertSymbolsModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const requestFrame = options.requestFrame ?? requestAnimationFrame;
  const consoleRef = options.consoleRef ?? console;
  const elements = getInsertSymbolsModalElements(documentRef);
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

  modal.style.display = 'flex';
  confirmButton.disabled = true;
  searchInput.value = '';
  grid.textContent = '';
  const sectionEntries = renderSymbolSections(documentRef, grid, selection, confirmButton, {
    consoleRef,
    copyText: options.copyText,
    flashCopyButton: options.flashCopyButton
  });
  const symbolItems = sectionEntries.flatMap((section) => section.items);

  function applyFilter(): void {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    for (const section of sectionEntries) {
      let sectionVisible = 0;
      for (const item of section.items) {
        const match = !query || item.search.includes(query);
        item.element.style.display = match ? '' : 'none';
        if (match) {
          visibleCount += 1;
          sectionVisible += 1;
        }
      }
      section.wrapper.style.display = sectionVisible ? '' : 'none';
    }

    emptyMessage.style.display = visibleCount ? 'none' : 'block';
  }

  function cleanup(): void {
    confirmButton.removeEventListener('click', insertSymbols);
    cancelButton.removeEventListener('click', closeModal);
    searchInput.removeEventListener('input', applyFilter);
    searchInput.removeEventListener('keydown', onKey);
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function insertSymbols(): void {
    if (!selection.size) return;
    const ordered = symbolItems
      .filter((item) => selection.has(item.entity))
      .map((item) => item.entity);
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

  emptyMessage.textContent = 'No symbols found.';
  applyFilter();
  confirmButton.addEventListener('click', insertSymbols);
  cancelButton.addEventListener('click', closeModal);
  searchInput.addEventListener('input', applyFilter);
  searchInput.addEventListener('keydown', onKey);
  requestFrame(() => searchInput.focus());

  return true;
}
