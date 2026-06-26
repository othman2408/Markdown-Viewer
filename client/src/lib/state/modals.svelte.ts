export type ShareMode = 'view' | 'edit';

export interface ModalStateSnapshot {
  activeModalId: string | null;
  findReplaceOpen: boolean;
  findReplaceDocked: boolean;
  findReplaceDrawerOpen: boolean;
  findReplaceErrorVisible: boolean;
  findReplaceErrorMessage: string;
  findReplaceMatchCurrent: number;
  findReplaceMatchTotal: number;
  findReplaceHasQuery: boolean;
  findReplaceMatchCase: boolean;
  findReplaceWholeWord: boolean;
  findReplaceUseRegex: boolean;
  findReplaceInSelection: boolean;
  findReplacePreserveCase: boolean;
  findReplaceWrapAround: boolean;
  shareOpen: boolean;
  shareMode: ShareMode;
  shareUrl: string;
  shareCopyDisabled: boolean;
  shareCopySucceeded: boolean;
}

export interface ModalStateApi {
  readonly snapshot: ModalStateSnapshot;
  readonly activeModalId: string | null;
  readonly findReplaceOpen: boolean;
  readonly findReplaceDocked: boolean;
  readonly findReplaceDrawerOpen: boolean;
  readonly findReplaceErrorVisible: boolean;
  readonly findReplaceErrorMessage: string;
  readonly findReplaceMatchCurrent: number;
  readonly findReplaceMatchTotal: number;
  readonly findReplaceHasQuery: boolean;
  readonly findReplaceMatchCase: boolean;
  readonly findReplaceWholeWord: boolean;
  readonly findReplaceUseRegex: boolean;
  readonly findReplaceInSelection: boolean;
  readonly findReplacePreserveCase: boolean;
  readonly findReplaceWrapAround: boolean;
  readonly shareOpen: boolean;
  readonly shareMode: ShareMode;
  readonly shareUrl: string;
  readonly shareCopyDisabled: boolean;
  readonly shareCopySucceeded: boolean;
  subscribe(run: (value: ModalStateSnapshot) => void): () => void;
  replace(payload: Partial<ModalStateSnapshot>): void;
}

function hasOwn(payload: object, key: keyof ModalStateSnapshot): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

export function normalizeShareMode(value: unknown, fallback: ShareMode = 'view'): ShareMode {
  return value === 'edit' || value === 'view' ? value : fallback;
}

export function normalizeModalId(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeNonNegativeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function createDefaultModalState(): ModalStateSnapshot {
  return {
    activeModalId: null,
    findReplaceOpen: false,
    findReplaceDocked: false,
    findReplaceDrawerOpen: false,
    findReplaceErrorVisible: false,
    findReplaceErrorMessage: '',
    findReplaceMatchCurrent: 0,
    findReplaceMatchTotal: 0,
    findReplaceHasQuery: false,
    findReplaceMatchCase: false,
    findReplaceWholeWord: false,
    findReplaceUseRegex: false,
    findReplaceInSelection: false,
    findReplacePreserveCase: false,
    findReplaceWrapAround: true,
    shareOpen: false,
    shareMode: 'view',
    shareUrl: '',
    shareCopyDisabled: true,
    shareCopySucceeded: false
  };
}

export function normalizeModalState(
  payload: Partial<ModalStateSnapshot> = {},
  fallback: ModalStateSnapshot = createDefaultModalState()
): ModalStateSnapshot {
  return {
    activeModalId: hasOwn(payload, 'activeModalId') ? normalizeModalId(payload.activeModalId) : fallback.activeModalId,
    findReplaceOpen: hasOwn(payload, 'findReplaceOpen') ? Boolean(payload.findReplaceOpen) : fallback.findReplaceOpen,
    findReplaceDocked: hasOwn(payload, 'findReplaceDocked') ? Boolean(payload.findReplaceDocked) : fallback.findReplaceDocked,
    findReplaceDrawerOpen: hasOwn(payload, 'findReplaceDrawerOpen')
      ? Boolean(payload.findReplaceDrawerOpen)
      : fallback.findReplaceDrawerOpen,
    findReplaceErrorVisible: hasOwn(payload, 'findReplaceErrorVisible')
      ? Boolean(payload.findReplaceErrorVisible)
      : fallback.findReplaceErrorVisible,
    findReplaceErrorMessage: hasOwn(payload, 'findReplaceErrorMessage')
      ? String(payload.findReplaceErrorMessage || '')
      : fallback.findReplaceErrorMessage,
    findReplaceMatchCurrent: hasOwn(payload, 'findReplaceMatchCurrent')
      ? normalizeNonNegativeInteger(payload.findReplaceMatchCurrent)
      : fallback.findReplaceMatchCurrent,
    findReplaceMatchTotal: hasOwn(payload, 'findReplaceMatchTotal')
      ? normalizeNonNegativeInteger(payload.findReplaceMatchTotal)
      : fallback.findReplaceMatchTotal,
    findReplaceHasQuery: hasOwn(payload, 'findReplaceHasQuery')
      ? Boolean(payload.findReplaceHasQuery)
      : fallback.findReplaceHasQuery,
    findReplaceMatchCase: hasOwn(payload, 'findReplaceMatchCase')
      ? Boolean(payload.findReplaceMatchCase)
      : fallback.findReplaceMatchCase,
    findReplaceWholeWord: hasOwn(payload, 'findReplaceWholeWord')
      ? Boolean(payload.findReplaceWholeWord)
      : fallback.findReplaceWholeWord,
    findReplaceUseRegex: hasOwn(payload, 'findReplaceUseRegex')
      ? Boolean(payload.findReplaceUseRegex)
      : fallback.findReplaceUseRegex,
    findReplaceInSelection: hasOwn(payload, 'findReplaceInSelection')
      ? Boolean(payload.findReplaceInSelection)
      : fallback.findReplaceInSelection,
    findReplacePreserveCase: hasOwn(payload, 'findReplacePreserveCase')
      ? Boolean(payload.findReplacePreserveCase)
      : fallback.findReplacePreserveCase,
    findReplaceWrapAround: hasOwn(payload, 'findReplaceWrapAround')
      ? Boolean(payload.findReplaceWrapAround)
      : fallback.findReplaceWrapAround,
    shareOpen: hasOwn(payload, 'shareOpen') ? Boolean(payload.shareOpen) : fallback.shareOpen,
    shareMode: hasOwn(payload, 'shareMode') ? normalizeShareMode(payload.shareMode, fallback.shareMode) : fallback.shareMode,
    shareUrl: hasOwn(payload, 'shareUrl') ? String(payload.shareUrl || '') : fallback.shareUrl,
    shareCopyDisabled: hasOwn(payload, 'shareCopyDisabled')
      ? Boolean(payload.shareCopyDisabled)
      : fallback.shareCopyDisabled,
    shareCopySucceeded: hasOwn(payload, 'shareCopySucceeded')
      ? Boolean(payload.shareCopySucceeded)
      : fallback.shareCopySucceeded
  };
}

export function createModalState(initial: Partial<ModalStateSnapshot> = {}): ModalStateApi {
  let snapshot = $state<ModalStateSnapshot>(normalizeModalState(initial));
  const subscribers = new Set<(value: ModalStateSnapshot) => void>();

  function emit(): void {
    const value = normalizeModalState(snapshot);
    subscribers.forEach((run) => run(value));
  }

  function replace(payload: Partial<ModalStateSnapshot>): void {
    snapshot = normalizeModalState(payload, snapshot);
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    get activeModalId() {
      return snapshot.activeModalId;
    },
    get findReplaceOpen() {
      return snapshot.findReplaceOpen;
    },
    get findReplaceDocked() {
      return snapshot.findReplaceDocked;
    },
    get findReplaceDrawerOpen() {
      return snapshot.findReplaceDrawerOpen;
    },
    get findReplaceErrorVisible() {
      return snapshot.findReplaceErrorVisible;
    },
    get findReplaceErrorMessage() {
      return snapshot.findReplaceErrorMessage;
    },
    get findReplaceMatchCurrent() {
      return snapshot.findReplaceMatchCurrent;
    },
    get findReplaceMatchTotal() {
      return snapshot.findReplaceMatchTotal;
    },
    get findReplaceHasQuery() {
      return snapshot.findReplaceHasQuery;
    },
    get findReplaceMatchCase() {
      return snapshot.findReplaceMatchCase;
    },
    get findReplaceWholeWord() {
      return snapshot.findReplaceWholeWord;
    },
    get findReplaceUseRegex() {
      return snapshot.findReplaceUseRegex;
    },
    get findReplaceInSelection() {
      return snapshot.findReplaceInSelection;
    },
    get findReplacePreserveCase() {
      return snapshot.findReplacePreserveCase;
    },
    get findReplaceWrapAround() {
      return snapshot.findReplaceWrapAround;
    },
    get shareOpen() {
      return snapshot.shareOpen;
    },
    get shareMode() {
      return snapshot.shareMode;
    },
    get shareUrl() {
      return snapshot.shareUrl;
    },
    get shareCopyDisabled() {
      return snapshot.shareCopyDisabled;
    },
    get shareCopySucceeded() {
      return snapshot.shareCopySucceeded;
    },
    subscribe(run) {
      run(normalizeModalState(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    },
    replace(payload) {
      replace(payload);
    }
  };
}

export const modalState = createModalState();
