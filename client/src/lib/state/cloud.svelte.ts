export interface CloudStateSnapshot {
  enabled: boolean;
  csrfToken: string | null;
  saveInFlight: boolean;
  saveQueued: boolean;
  logoutInFlight: boolean;
  shareRequestSeq: number;
}

export interface CloudStateApi {
  readonly snapshot: CloudStateSnapshot;
  readonly enabled: boolean;
  readonly csrfToken: string | null;
  readonly saveInFlight: boolean;
  readonly saveQueued: boolean;
  readonly logoutInFlight: boolean;
  readonly shareRequestSeq: number;
  subscribe(run: (value: CloudStateSnapshot) => void): () => void;
  replace(payload: Partial<CloudStateSnapshot>): void;
}

function hasOwn(payload: object, key: keyof CloudStateSnapshot): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function normalizeSequence(value: unknown, fallback: number): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
}

export function createDefaultCloudState(): CloudStateSnapshot {
  return {
    enabled: false,
    csrfToken: null,
    saveInFlight: false,
    saveQueued: false,
    logoutInFlight: false,
    shareRequestSeq: 0
  };
}

export function normalizeCloudState(
  payload: Partial<CloudStateSnapshot> = {},
  fallback: CloudStateSnapshot = createDefaultCloudState()
): CloudStateSnapshot {
  return {
    enabled: hasOwn(payload, 'enabled') ? Boolean(payload.enabled) : fallback.enabled,
    csrfToken: hasOwn(payload, 'csrfToken')
      ? (typeof payload.csrfToken === 'string' && payload.csrfToken ? payload.csrfToken : null)
      : fallback.csrfToken,
    saveInFlight: hasOwn(payload, 'saveInFlight') ? Boolean(payload.saveInFlight) : fallback.saveInFlight,
    saveQueued: hasOwn(payload, 'saveQueued') ? Boolean(payload.saveQueued) : fallback.saveQueued,
    logoutInFlight: hasOwn(payload, 'logoutInFlight') ? Boolean(payload.logoutInFlight) : fallback.logoutInFlight,
    shareRequestSeq: normalizeSequence(payload.shareRequestSeq, fallback.shareRequestSeq)
  };
}

export function createCloudState(initial: Partial<CloudStateSnapshot> = {}): CloudStateApi {
  let snapshot = $state<CloudStateSnapshot>(normalizeCloudState(initial));
  const subscribers = new Set<(value: CloudStateSnapshot) => void>();

  function emit(): void {
    const value = normalizeCloudState(snapshot);
    subscribers.forEach((run) => run(value));
  }

  function replace(payload: Partial<CloudStateSnapshot>): void {
    snapshot = normalizeCloudState(payload, snapshot);
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    get enabled() {
      return snapshot.enabled;
    },
    get csrfToken() {
      return snapshot.csrfToken;
    },
    get saveInFlight() {
      return snapshot.saveInFlight;
    },
    get saveQueued() {
      return snapshot.saveQueued;
    },
    get logoutInFlight() {
      return snapshot.logoutInFlight;
    },
    get shareRequestSeq() {
      return snapshot.shareRequestSeq;
    },
    subscribe(run) {
      run(normalizeCloudState(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    },
    replace(payload) {
      replace(payload);
    }
  };
}

export const cloudState = createCloudState();
