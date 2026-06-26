import type { ViewMode } from '../types/workspace';

export interface UiStateSnapshot {
  theme: 'light' | 'dark';
  mobileMenuOpen: boolean;
  viewMode: ViewMode;
}

export interface UiStateApi {
  readonly snapshot: UiStateSnapshot;
  readonly theme: 'light' | 'dark';
  readonly mobileMenuOpen: boolean;
  readonly viewMode: ViewMode;
  subscribe(run: (value: UiStateSnapshot) => void): () => void;
  replace(payload: Partial<UiStateSnapshot>): void;
  setMobileMenuOpen(open: boolean): void;
}

function normalizeTheme(value: unknown, fallback: 'light' | 'dark' = 'light'): 'light' | 'dark' {
  return value === 'dark' || value === 'light' ? value : fallback;
}

function normalizeViewMode(value: unknown, fallback: ViewMode = 'split'): ViewMode {
  return value === 'editor' || value === 'preview' || value === 'split' ? value : fallback;
}

export function normalizeUiState(payload: Partial<UiStateSnapshot> = {}, fallback: UiStateSnapshot = {
  theme: 'light',
  mobileMenuOpen: false,
  viewMode: 'split'
}): UiStateSnapshot {
  return {
    theme: normalizeTheme(payload.theme, fallback.theme),
    mobileMenuOpen: Object.prototype.hasOwnProperty.call(payload, 'mobileMenuOpen')
      ? Boolean(payload.mobileMenuOpen)
      : fallback.mobileMenuOpen,
    viewMode: normalizeViewMode(payload.viewMode, fallback.viewMode)
  };
}

export function createUiState(initial: Partial<UiStateSnapshot> = {}): UiStateApi {
  let snapshot = $state<UiStateSnapshot>(normalizeUiState(initial));
  const subscribers = new Set<(value: UiStateSnapshot) => void>();

  function emit(): void {
    const value = normalizeUiState(snapshot);
    subscribers.forEach((run) => run(value));
  }

  function replace(payload: Partial<UiStateSnapshot>): void {
    snapshot = normalizeUiState(payload, snapshot);
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    get theme() {
      return snapshot.theme;
    },
    get mobileMenuOpen() {
      return snapshot.mobileMenuOpen;
    },
    get viewMode() {
      return snapshot.viewMode;
    },
    subscribe(run) {
      run(normalizeUiState(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    },
    replace(payload) {
      replace(payload);
    },
    setMobileMenuOpen(open) {
      replace({ mobileMenuOpen: open });
    }
  };
}

export const uiState = createUiState();
