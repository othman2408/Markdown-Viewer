import { createEmptyLineNumberRenderState, type LineNumberRenderState } from '../editor/lineNumbers';
import type { DocumentStats } from '../editor/stats';
import type { TextSelection } from '../types/editor';
import type { ViewMode } from '../types/workspace';

export interface EditorStateSnapshot {
  value: string;
  stats: DocumentStats;
  selection: TextSelection;
  scrollTop: number;
  scrollLeft: number;
  viewMode: ViewMode;
  syncScrollingEnabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  direction: 'ltr' | 'rtl';
  lineNumbers: LineNumberRenderState;
}

export interface EditorStateApi {
  readonly snapshot: EditorStateSnapshot;
  readonly value: string;
  readonly stats: DocumentStats;
  readonly selection: TextSelection;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewMode: ViewMode;
  readonly syncScrollingEnabled: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly direction: 'ltr' | 'rtl';
  readonly lineNumbers: LineNumberRenderState;
  subscribe(run: (value: EditorStateSnapshot) => void): () => void;
  replace(payload: Partial<EditorStateSnapshot>): void;
}

function hasOwn(payload: object, key: keyof EditorStateSnapshot): boolean {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function normalizeViewMode(value: unknown, fallback: ViewMode = 'split'): ViewMode {
  return value === 'editor' || value === 'preview' || value === 'split' ? value : fallback;
}

function normalizeDirection(value: unknown, fallback: 'ltr' | 'rtl' = 'ltr'): 'ltr' | 'rtl' {
  return value === 'rtl' || value === 'ltr' ? value : fallback;
}

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function normalizeStats(stats: Partial<DocumentStats> | undefined, fallback: DocumentStats): DocumentStats {
  return {
    charCount: Math.max(0, Math.floor(normalizeFiniteNumber(stats?.charCount, fallback.charCount))),
    wordCount: Math.max(0, Math.floor(normalizeFiniteNumber(stats?.wordCount, fallback.wordCount))),
    readingTimeMinutes: Math.max(0, Math.floor(normalizeFiniteNumber(stats?.readingTimeMinutes, fallback.readingTimeMinutes)))
  };
}

function normalizeSelection(selection: Partial<TextSelection> | undefined, fallback: TextSelection): TextSelection {
  const direction = selection?.direction;

  return {
    start: Math.max(0, Math.floor(normalizeFiniteNumber(selection?.start, fallback.start))),
    end: Math.max(0, Math.floor(normalizeFiniteNumber(selection?.end, fallback.end))),
    direction: direction === 'forward' || direction === 'backward' || direction === 'none' ? direction : fallback.direction
  };
}

function normalizeLineNumbers(
  lineNumbers: Partial<LineNumberRenderState> | undefined,
  fallback: LineNumberRenderState
): LineNumberRenderState {
  return {
    lineCount: Math.max(0, Math.floor(normalizeFiniteNumber(lineNumbers?.lineCount, fallback.lineCount))),
    gutterCh: Math.max(0, normalizeFiniteNumber(lineNumbers?.gutterCh, fallback.gutterCh)),
    rows: Array.isArray(lineNumbers?.rows)
      ? lineNumbers.rows.map((row) => ({
          lineIndex: Math.max(0, Math.floor(normalizeFiniteNumber(row.lineIndex, 0))),
          label: String(row.label || ''),
          heightPx: Math.max(0, normalizeFiniteNumber(row.heightPx, 0)),
          active: Boolean(row.active)
        }))
      : fallback.rows.map((row) => ({ ...row }))
  };
}

export function createDefaultEditorState(): EditorStateSnapshot {
  return {
    value: '',
    stats: {
      charCount: 0,
      wordCount: 0,
      readingTimeMinutes: 0
    },
    selection: {
      start: 0,
      end: 0,
      direction: 'none'
    },
    scrollTop: 0,
    scrollLeft: 0,
    viewMode: 'split',
    syncScrollingEnabled: true,
    canUndo: false,
    canRedo: false,
    direction: 'ltr',
    lineNumbers: createEmptyLineNumberRenderState()
  };
}

export function normalizeEditorState(
  payload: Partial<EditorStateSnapshot> = {},
  fallback: EditorStateSnapshot = createDefaultEditorState()
): EditorStateSnapshot {
  return {
    value: typeof payload.value === 'string' ? payload.value : fallback.value,
    stats: normalizeStats(payload.stats, fallback.stats),
    selection: normalizeSelection(payload.selection, fallback.selection),
    scrollTop: Math.max(0, normalizeFiniteNumber(payload.scrollTop, fallback.scrollTop)),
    scrollLeft: Math.max(0, normalizeFiniteNumber(payload.scrollLeft, fallback.scrollLeft)),
    viewMode: normalizeViewMode(payload.viewMode, fallback.viewMode),
    syncScrollingEnabled: hasOwn(payload, 'syncScrollingEnabled')
      ? Boolean(payload.syncScrollingEnabled)
      : fallback.syncScrollingEnabled,
    canUndo: hasOwn(payload, 'canUndo') ? Boolean(payload.canUndo) : fallback.canUndo,
    canRedo: hasOwn(payload, 'canRedo') ? Boolean(payload.canRedo) : fallback.canRedo,
    direction: normalizeDirection(payload.direction, fallback.direction),
    lineNumbers: normalizeLineNumbers(payload.lineNumbers, fallback.lineNumbers)
  };
}

export function createEditorState(initial: Partial<EditorStateSnapshot> = {}): EditorStateApi {
  let snapshot = $state<EditorStateSnapshot>(normalizeEditorState(initial));
  const subscribers = new Set<(value: EditorStateSnapshot) => void>();

  function emit(): void {
    const value = normalizeEditorState(snapshot);
    subscribers.forEach((run) => run(value));
  }

  function replace(payload: Partial<EditorStateSnapshot>): void {
    snapshot = normalizeEditorState(payload, snapshot);
    emit();
  }

  return {
    get snapshot() {
      return snapshot;
    },
    get value() {
      return snapshot.value;
    },
    get stats() {
      return snapshot.stats;
    },
    get selection() {
      return snapshot.selection;
    },
    get scrollTop() {
      return snapshot.scrollTop;
    },
    get scrollLeft() {
      return snapshot.scrollLeft;
    },
    get viewMode() {
      return snapshot.viewMode;
    },
    get syncScrollingEnabled() {
      return snapshot.syncScrollingEnabled;
    },
    get canUndo() {
      return snapshot.canUndo;
    },
    get canRedo() {
      return snapshot.canRedo;
    },
    get direction() {
      return snapshot.direction;
    },
    get lineNumbers() {
      return snapshot.lineNumbers;
    },
    subscribe(run) {
      run(normalizeEditorState(snapshot));
      subscribers.add(run);
      return () => subscribers.delete(run);
    },
    replace(payload) {
      replace(payload);
    }
  };
}

export const editorState = createEditorState();
