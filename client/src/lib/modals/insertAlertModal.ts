export type GitHubAlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export interface GitHubAlertMeta {
  label: string;
  path?: string;
  viewBox?: string;
}

export interface OpenInsertAlertModalOptions {
  documentRef?: Document;
  selectionEnd: number;
  selectionStart: number;
  insertBlock(input: {
    block: string;
    end: number;
    start: number;
  }): void;
}

export interface InsertAlertModalElements {
  cancelButton: HTMLElement;
  confirmButton: HTMLElement;
  grid: HTMLElement;
  modal: HTMLElement;
}

export const GITHUB_ALERT_TYPES: GitHubAlertType[] = ['note', 'tip', 'important', 'warning', 'caution'];

export const GITHUB_ALERT_META: Record<GitHubAlertType, GitHubAlertMeta> = {
  note: {
    label: 'Note',
    viewBox: '0 0 512 512',
    path: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336l24 0 0-64-24 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l48 0c13.3 0 24 10.7 24 24l0 88 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z'
  },
  tip: {
    label: 'Tip',
    viewBox: '0 0 384 512',
    path: 'M297.2 248.9C311.6 228.3 320 203.2 320 176c0-70.7-57.3-128-128-128S64 105.3 64 176c0 27.2 8.4 52.3 22.8 72.9c3.7 5.3 8.1 11.3 12.8 17.7c0 0 0 0 0 0c12.9 17.7 28.3 38.9 39.8 59.8c10.4 19 15.7 38.8 18.3 57.5L109 384c-2.2-12-5.9-23.7-11.8-34.5c-9.9-18-22.2-34.9-34.5-51.8c0 0 0 0 0 0s0 0 0 0c-5.2-7.1-10.4-14.2-15.4-21.4C27.6 247.9 16 213.3 16 176C16 78.8 94.8 0 192 0s176 78.8 176 176c0 37.3-11.6 71.9-31.4 100.3c-5 7.2-10.2 14.3-15.4 21.4c0 0 0 0 0 0s0 0 0 0c-12.3 16.8-24.6 33.7-34.5 51.8c-5.9 10.8-9.6 22.5-11.8 34.5l-48.6 0c2.6-18.7 7.9-38.6 18.3-57.5c11.5-20.9 26.9-42.1 39.8-59.8c0 0 0 0 0 0s0 0 0 0s0 0 0 0c4.7-6.4 9-12.4 12.7-17.7zM192 128c-26.5 0-48 21.5-48 48c0 8.8-7.2 16-16 16s-16-7.2-16-16c0-44.2 35.8-80 80-80c8.8 0 16 7.2 16 16s-7.2 16-16 16zm0 384c-44.2 0-80-35.8-80-80l0-16 160 0 0 16c0 44.2-35.8 80-80 80z'
  },
  important: {
    label: 'Important',
    viewBox: '0 0 512 512',
    path: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24l0 112c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-112c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z'
  },
  warning: {
    label: 'Warning',
    viewBox: '0 0 512 512',
    path: 'M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480L40 480c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24l0 112c0 13.3 10.7 24 24 24s24-10.7 24-24l0-112c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z'
  },
  caution: {
    label: 'Caution',
    viewBox: '0 0 512 512',
    path: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z'
  }
};

export function buildGitHubAlertBlock(type: string, meta: GitHubAlertMeta): string {
  return `> [!${type.toUpperCase()}]\n> ${meta.label} details go here.\n`;
}

export function createMarkdownAlertPreview(
  documentRef: Document,
  type: string,
  meta: GitHubAlertMeta
): HTMLDivElement {
  const wrapper = documentRef.createElement('div');
  wrapper.className = `markdown-alert markdown-alert-${type}`;

  const title = documentRef.createElement('p');
  title.className = 'markdown-alert-title';

  const icon = documentRef.createElement('span');
  icon.className = 'markdown-alert-icon';
  icon.setAttribute('aria-hidden', 'true');
  if (meta.path) {
    const svg = documentRef.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', meta.viewBox || '0 0 512 512');
    const path = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', meta.path);
    svg.appendChild(path);
    icon.appendChild(svg);
  }

  const label = documentRef.createElement('span');
  label.textContent = meta.label;
  title.append(icon, label);

  const body = documentRef.createElement('p');
  body.textContent = `${meta.label} details go here.`;

  wrapper.append(title, body);
  return wrapper;
}

export function getInsertAlertModalElements(documentRef: Document): InsertAlertModalElements | null {
  const modal = documentRef.getElementById('alert-modal');
  const grid = documentRef.getElementById('alert-modal-grid');
  const confirmButton = documentRef.getElementById('alert-modal-insert');
  const cancelButton = documentRef.getElementById('alert-modal-cancel');

  if (!modal || !grid || !confirmButton || !cancelButton) {
    return null;
  }

  return {
    cancelButton,
    confirmButton,
    grid,
    modal
  };
}

export function openInsertAlertModal(options: OpenInsertAlertModalOptions): boolean {
  const documentRef = options.documentRef ?? document;
  const elements = getInsertAlertModalElements(documentRef);
  if (!elements) return false;

  const {
    cancelButton,
    confirmButton,
    grid,
    modal
  } = elements;
  let selectedType: GitHubAlertType = GITHUB_ALERT_TYPES[0];
  const optionButtons: HTMLElement[] = [];

  modal.style.display = 'flex';
  grid.textContent = '';

  function cleanup(): void {
    confirmButton.removeEventListener('click', insertAlert);
    cancelButton.removeEventListener('click', closeModal);
    modal.removeEventListener('keydown', onKey);
  }

  function closeModal(): void {
    modal.style.display = 'none';
    cleanup();
  }

  function insertAlert(): void {
    const meta = GITHUB_ALERT_META[selectedType];
    modal.style.display = 'none';
    cleanup();
    options.insertBlock({
      start: options.selectionStart,
      end: options.selectionEnd,
      block: buildGitHubAlertBlock(selectedType, meta)
    });
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  }

  for (const type of GITHUB_ALERT_TYPES) {
    const meta = GITHUB_ALERT_META[type];
    const option = documentRef.createElement('button');
    option.type = 'button';
    option.className = 'alert-option';
    option.dataset.alertType = type;
    option.setAttribute('aria-pressed', (type === selectedType).toString());

    const preview = documentRef.createElement('div');
    preview.className = 'alert-preview';
    preview.appendChild(createMarkdownAlertPreview(documentRef, type, meta));
    option.appendChild(preview);

    if (type === selectedType) {
      option.classList.add('is-selected');
    }

    option.addEventListener('click', () => {
      selectedType = type;
      for (const item of optionButtons) {
        const isSelected = item === option;
        item.classList.toggle('is-selected', isSelected);
        item.setAttribute('aria-pressed', isSelected.toString());
      }
    });
    optionButtons.push(option);
    grid.appendChild(option);
  }

  confirmButton.addEventListener('click', insertAlert);
  cancelButton.addEventListener('click', closeModal);
  modal.addEventListener('keydown', onKey);

  return true;
}
