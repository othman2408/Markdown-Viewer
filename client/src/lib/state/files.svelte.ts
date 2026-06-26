export interface FileLibraryStateSnapshot {
  open: boolean;
  busy: boolean;
}

export interface FileLibraryStateApi {
  readonly snapshot: FileLibraryStateSnapshot;
  readonly open: boolean;
  readonly busy: boolean;
  close(): void;
  openModal(): void;
  replace(payload: Partial<FileLibraryStateSnapshot>): void;
  setBusy(busy: boolean): void;
  subscribe(run: (value: FileLibraryStateSnapshot) => void): () => void;
}

export function normalizeFileLibraryState(
  payload: Partial<FileLibraryStateSnapshot> = {},
  fallback: FileLibraryStateSnapshot = { open: false, busy: false }
): FileLibraryStateSnapshot {
  return {
    open: Object.prototype.hasOwnProperty.call(payload, 'open') ? Boolean(payload.open) : fallback.open,
    busy: Object.prototype.hasOwnProperty.call(payload, 'busy') ? Boolean(payload.busy) : fallback.busy
  };
}

export function createFileLibraryState(initial: Partial<FileLibraryStateSnapshot> = {}): FileLibraryStateApi {
  let snapshot = $state<FileLibraryStateSnapshot>(normalizeFileLibraryState(initial));
  const subscribers = new Set<(value: FileLibraryStateSnapshot) => void>();

  function emit(): void {
    const value = normalizeFileLibraryState(snapshot);
    subscribers.forEach((run) => run(value));
  }

  function replace(payload: Partial<FileLibraryStateSnapshot>): void {
    snapshot = normalizeFileLibraryState(payload, snapshot);
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    get open() {
      return snapshot.open;
    },
    get busy() {
      return snapshot.busy;
    },
    close() {
      replace({ open: false, busy: false });
    },
    openModal() {
      replace({ open: true });
    },
    replace(payload) {
      replace(payload);
    },
    setBusy(busy) {
      replace({ busy });
    },
    subscribe(run) {
      run(normalizeFileLibraryState(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    }
  };
}

export const fileLibraryState = createFileLibraryState();
