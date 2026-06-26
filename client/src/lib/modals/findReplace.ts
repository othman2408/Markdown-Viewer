import type { ModalStateSnapshot } from '../state/modals.svelte';

export type FindReplaceModalPatch = Pick<ModalStateSnapshot, 'findReplaceOpen' | 'findReplaceDocked'>;
export type FindReplaceDrawerPatch = Pick<ModalStateSnapshot, 'findReplaceDrawerOpen'>;
export type FindReplaceErrorPatch = Pick<ModalStateSnapshot, 'findReplaceErrorVisible' | 'findReplaceErrorMessage'>;
export type FindReplaceControlsPatch = Pick<
  ModalStateSnapshot,
  'findReplaceMatchCurrent' | 'findReplaceMatchTotal' | 'findReplaceHasQuery'
>;
export type FindReplaceOptionsPatch = Pick<
  ModalStateSnapshot,
  | 'findReplaceMatchCase'
  | 'findReplaceWholeWord'
  | 'findReplaceUseRegex'
  | 'findReplaceInSelection'
  | 'findReplacePreserveCase'
  | 'findReplaceWrapAround'
>;
export interface FindReplaceFloatingPosition {
  left: string | null;
  right: string | null;
  top: string | null;
}

export interface FindReplaceDiffPreviewOptions {
  closeModal?: (modal: HTMLElement) => void;
  confirmId?: string;
  containerId?: string;
  documentRef?: Document;
  draftValue: string;
  modalId?: string;
  openModal?: (
    modal: HTMLElement,
    options: {
      focusTarget?: HTMLElement | null;
      onClose?: () => void;
    }
  ) => void;
  originalValue: string;
}

export interface FindReplaceFloatingConstrainOptions {
  docked: boolean;
  minViewportWidth?: number;
  panel: HTMLElement;
  viewportHeight?: number;
  viewportWidth?: number;
}

export interface FindReplaceShortcutContext {
  documentRef?: Document;
  isFindModalOpen: boolean;
}

export interface FindReplaceShortcutEventLike {
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  preventDefault(): void;
}

export interface FindReplaceShortcutHandlers {
  closeFindReplaceModal(): void;
  openFindReplaceModal(): void;
}

export interface FindReplaceModalDomHandlers {
  closeAppModal(modal: HTMLElement): void;
  closeFindReplaceModal(): void;
  executeBulkReplace(): void;
  onFindInput(): void;
  onHistoryChange(value: string): void;
  onOptionToggle(id: string): void;
  onReplaceInput(): void;
  onScopeChange(): void;
  onToggleDock(): void;
  onToggleDrawer(open: boolean): void;
  replaceAllMatches(): void;
  replaceCurrentMatch(): void;
  resetPosition(): void;
  selectFindMatch(direction: number): void;
}

export interface AttachFindReplaceModalDomHandlersOptions {
  documentRef?: Document;
  modal: HTMLElement;
}

const findReplaceOptionFieldById: Partial<Record<string, keyof FindReplaceOptionsPatch>> = {
  'find-case': 'findReplaceMatchCase',
  'find-word': 'findReplaceWholeWord',
  'find-regex': 'findReplaceUseRegex',
  'find-sel': 'findReplaceInSelection',
  'replace-preserve-case': 'findReplacePreserveCase',
  'find-wrap': 'findReplaceWrapAround'
};

function normalizeCount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function createDefaultFindReplaceOptions(): FindReplaceOptionsPatch {
  return {
    findReplaceMatchCase: false,
    findReplaceWholeWord: false,
    findReplaceUseRegex: false,
    findReplaceInSelection: false,
    findReplacePreserveCase: false,
    findReplaceWrapAround: true
  };
}

export function normalizeFindReplaceOptions(options: Partial<FindReplaceOptionsPatch> = {}): FindReplaceOptionsPatch {
  const defaults = createDefaultFindReplaceOptions();

  return {
    findReplaceMatchCase: Boolean(options.findReplaceMatchCase ?? defaults.findReplaceMatchCase),
    findReplaceWholeWord: Boolean(options.findReplaceWholeWord ?? defaults.findReplaceWholeWord),
    findReplaceUseRegex: Boolean(options.findReplaceUseRegex ?? defaults.findReplaceUseRegex),
    findReplaceInSelection: Boolean(options.findReplaceInSelection ?? defaults.findReplaceInSelection),
    findReplacePreserveCase: Boolean(options.findReplacePreserveCase ?? defaults.findReplacePreserveCase),
    findReplaceWrapAround: Boolean(options.findReplaceWrapAround ?? defaults.findReplaceWrapAround)
  };
}

export function prepareFindReplaceOptionToggle(
  options: Partial<FindReplaceOptionsPatch>,
  optionId: unknown
): FindReplaceOptionsPatch {
  const nextOptions = normalizeFindReplaceOptions(options);
  const field = typeof optionId === 'string' ? findReplaceOptionFieldById[optionId] : undefined;

  if (field) {
    nextOptions[field] = !nextOptions[field];
  }

  return nextOptions;
}

export function prepareFindReplaceOpen(docked: unknown = false): FindReplaceModalPatch {
  return {
    findReplaceOpen: true,
    findReplaceDocked: Boolean(docked)
  };
}

export function prepareFindReplaceClose(): Pick<ModalStateSnapshot, 'findReplaceOpen'> {
  return {
    findReplaceOpen: false
  };
}

export function prepareFindReplaceDockState(docked: unknown): Pick<ModalStateSnapshot, 'findReplaceDocked'> {
  return {
    findReplaceDocked: Boolean(docked)
  };
}

export function prepareFindReplaceDrawerState(open: unknown): FindReplaceDrawerPatch {
  return {
    findReplaceDrawerOpen: Boolean(open)
  };
}

export function prepareFindReplaceErrorHidden(): Pick<ModalStateSnapshot, 'findReplaceErrorVisible'> {
  return {
    findReplaceErrorVisible: false
  };
}

export function prepareFindReplaceErrorVisible(message: unknown): FindReplaceErrorPatch {
  return {
    findReplaceErrorVisible: true,
    findReplaceErrorMessage: String(message || '')
  };
}

export function prepareFindReplaceControlsState(
  current: unknown,
  total: unknown,
  hasQuery: unknown
): FindReplaceControlsPatch {
  const normalizedTotal = normalizeCount(total);
  const normalizedCurrent = Math.min(normalizeCount(current), normalizedTotal);

  return {
    findReplaceMatchCurrent: normalizedCurrent,
    findReplaceMatchTotal: normalizedTotal,
    findReplaceHasQuery: Boolean(hasQuery)
  };
}

function createDiffLine(
  documentRef: Document,
  className: string,
  lineNumberValue: number,
  prefix: string,
  content: string
): HTMLDivElement {
  const line = documentRef.createElement('div');
  line.className = `diff-line ${className}`;

  const lineNumber = documentRef.createElement('span');
  lineNumber.className = 'diff-line-num';
  lineNumber.textContent = String(lineNumberValue);

  const lineContent = documentRef.createElement('span');
  lineContent.className = 'diff-line-content';
  lineContent.textContent = `${prefix}${content}`;

  line.append(lineNumber, lineContent);
  return line;
}

export function renderFindReplaceDiffPreview(options: FindReplaceDiffPreviewOptions): boolean {
  const documentRef = options.documentRef ?? (typeof document === 'undefined' ? undefined : document);
  if (!documentRef) return false;

  const container = documentRef.getElementById(options.containerId ?? 'find-replace-diff-container');
  const modal = documentRef.getElementById(options.modalId ?? 'find-replace-diff-modal');
  if (!container || !modal) return false;

  const lines = options.originalValue.split('\n');
  const draftLines = options.draftValue.split('\n');
  const fragment = documentRef.createDocumentFragment();
  const maxLines = Math.max(lines.length, draftLines.length);

  container.textContent = '';

  for (let index = 0; index < maxLines; index += 1) {
    const origLine = lines[index] !== undefined ? lines[index] : null;
    const newLine = draftLines[index] !== undefined ? draftLines[index] : null;

    if (origLine !== newLine) {
      if (origLine !== null) {
        fragment.appendChild(createDiffLine(documentRef, 'deletion', index + 1, '- ', origLine));
      }
      if (newLine !== null) {
        fragment.appendChild(createDiffLine(documentRef, 'addition', index + 1, '+ ', newLine));
      }
      continue;
    }

    if (origLine !== null) {
      const hasDiffNearby = Array.from({ length: 5 }, (_, nearbyIndex) => index - 2 + nearbyIndex)
        .some((lineIndex) => (
          lines[lineIndex] !== undefined
          && draftLines[lineIndex] !== undefined
          && lines[lineIndex] !== draftLines[lineIndex]
        ));

      if (hasDiffNearby) {
        fragment.appendChild(createDiffLine(documentRef, 'context', index + 1, '  ', origLine));
      }
    }
  }

  container.appendChild(fragment);

  if (options.openModal) {
    const focusTarget = documentRef.getElementById(options.confirmId ?? 'find-replace-diff-confirm');
    options.openModal(modal, {
      focusTarget,
      onClose: options.closeModal ? () => options.closeModal?.(modal) : undefined
    });
  }

  return true;
}

export function renderFindReplaceHistoryOptions(
  select: HTMLSelectElement,
  queries: readonly unknown[]
): void {
  select.textContent = '';

  const defaultOption = select.ownerDocument.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Recent queries...';
  select.appendChild(defaultOption);

  for (const query of queries) {
    const option = select.ownerDocument.createElement('option');
    const value = String(query);
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

export function resetFindReplaceFloatingPosition(panel: HTMLElement): FindReplaceFloatingPosition {
  panel.style.left = '';
  panel.style.top = '';
  panel.style.right = '';

  return {
    left: null,
    right: null,
    top: null
  };
}

export function constrainFindReplaceFloatingPosition(
  options: FindReplaceFloatingConstrainOptions
): Pick<FindReplaceFloatingPosition, 'left' | 'top'> | null {
  const minViewportWidth = options.minViewportWidth ?? 768;
  const viewportWidth = options.viewportWidth ?? window.innerWidth;
  const viewportHeight = options.viewportHeight ?? window.innerHeight;
  const { panel } = options;

  if (options.docked || panel.style.display === 'none') return null;
  if (viewportWidth < minViewportWidth) return null;
  if (!panel.style.left || panel.style.left === 'auto') return null;

  const leftValue = parseFloat(panel.style.left) || 0;
  const topValue = parseFloat(panel.style.top) || 0;
  const maxX = viewportWidth - panel.offsetWidth;
  const maxY = viewportHeight - panel.offsetHeight;
  const constrainedLeft = `${Math.max(0, Math.min(maxX, leftValue))}px`;
  const constrainedTop = `${Math.max(0, Math.min(maxY, topValue))}px`;

  panel.style.left = constrainedLeft;
  panel.style.top = constrainedTop;

  return {
    left: constrainedLeft,
    top: constrainedTop
  };
}

function focusAndSelectFindReplaceField(documentRef: Document, id: string): void {
  const field = documentRef.getElementById(id);
  if (!field) return;

  if (typeof field.focus === 'function') {
    field.focus();
  }

  const selectableField = field as HTMLElement & { select?: () => void };
  if (typeof selectableField.select === 'function') {
    selectableField.select();
  }
}

export function handleFindReplaceShortcut(
  event: FindReplaceShortcutEventLike,
  context: FindReplaceShortcutContext,
  handlers: FindReplaceShortcutHandlers
): boolean {
  const documentRef = context.documentRef ?? (typeof document === 'undefined' ? undefined : document);
  const isCommandKey = event.ctrlKey || event.metaKey;
  const lowerKey = event.key.toLowerCase();

  if (isCommandKey && lowerKey === 'f') {
    event.preventDefault();
    handlers.openFindReplaceModal();
    if (documentRef) {
      focusAndSelectFindReplaceField(documentRef, 'find-replace-input');
    }
    return true;
  }

  if (isCommandKey && lowerKey === 'h') {
    event.preventDefault();
    handlers.openFindReplaceModal();
    if (documentRef) {
      focusAndSelectFindReplaceField(documentRef, 'find-replace-with');
    }
    return true;
  }

  if (event.key === 'Escape' && context.isFindModalOpen) {
    event.preventDefault();
    handlers.closeFindReplaceModal();
    return true;
  }

  return false;
}

function addClickListener(
  documentRef: Document,
  id: string,
  handler: (event: MouseEvent) => void
): void {
  const element = documentRef.getElementById(id);
  if (element) {
    element.addEventListener('click', handler);
  }
}

export function attachFindReplaceModalDomHandlers(
  options: AttachFindReplaceModalDomHandlersOptions,
  handlers: FindReplaceModalDomHandlers
): boolean {
  const documentRef = options.documentRef ?? options.modal.ownerDocument;
  const toggleButtons = ['find-case', 'find-word', 'find-regex', 'find-sel', 'replace-preserve-case', 'find-wrap'];

  for (const id of toggleButtons) {
    addClickListener(documentRef, id, () => {
      handlers.onOptionToggle(id);
    });
  }

  const historySelect = documentRef.getElementById('find-replace-history') as HTMLSelectElement | null;
  if (historySelect) {
    historySelect.addEventListener('change', () => {
      handlers.onHistoryChange(historySelect.value);
    });
  }

  const scopeSelect = documentRef.getElementById('find-replace-scope');
  if (scopeSelect) {
    scopeSelect.addEventListener('change', handlers.onScopeChange);
  }

  addClickListener(documentRef, 'find-replace-reset', handlers.resetPosition);
  addClickListener(documentRef, 'find-replace-reset-footer', handlers.resetPosition);
  addClickListener(documentRef, 'find-replace-dock', handlers.onToggleDock);

  const drawerToggle = documentRef.getElementById('fr-drawer-toggle');
  const drawerContent = documentRef.getElementById('fr-drawer-content');
  if (drawerToggle && drawerContent) {
    drawerToggle.addEventListener('click', () => {
      handlers.onToggleDrawer(drawerContent.style.display !== 'flex');
    });
  }

  const findInput = documentRef.getElementById('find-replace-input');
  if (findInput) {
    findInput.addEventListener('input', handlers.onFindInput);
    findInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handlers.selectFindMatch(event.shiftKey ? -1 : 1);
      }
    });
  }

  const replaceInput = documentRef.getElementById('find-replace-with');
  if (replaceInput) {
    replaceInput.addEventListener('input', handlers.onReplaceInput);
  }

  addClickListener(documentRef, 'find-prev', () => handlers.selectFindMatch(-1));
  addClickListener(documentRef, 'find-next', () => handlers.selectFindMatch(1));
  addClickListener(documentRef, 'find-replace-current', handlers.replaceCurrentMatch);
  addClickListener(documentRef, 'find-replace-all', handlers.replaceAllMatches);
  addClickListener(documentRef, 'find-replace-close', handlers.closeFindReplaceModal);
  addClickListener(documentRef, 'find-replace-close-icon', handlers.closeFindReplaceModal);

  const diffModal = documentRef.getElementById('find-replace-diff-modal');
  addClickListener(documentRef, 'find-replace-diff-confirm', () => {
    handlers.executeBulkReplace();
    if (diffModal) {
      handlers.closeAppModal(diffModal);
    }
  });
  addClickListener(documentRef, 'find-replace-diff-cancel', () => {
    if (diffModal) {
      handlers.closeAppModal(diffModal);
    }
  });
  addClickListener(documentRef, 'find-replace-diff-close-icon', () => {
    if (diffModal) {
      handlers.closeAppModal(diffModal);
    }
  });

  return true;
}
