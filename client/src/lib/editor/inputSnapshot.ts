import type { TextSelection } from '../types/editor';
import { getDocumentStats, type DocumentStats } from './stats';

export interface TextareaSnapshotSource {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection?: string;
  scrollTop: number;
  scrollLeft: number;
}

export interface EditorInputSnapshot {
  value: string;
  selection: TextSelection;
  scrollTop: number;
  scrollLeft: number;
  stats?: DocumentStats;
}

export interface EditorInputMergeState {
  value: string;
  selection: TextSelection;
  scrollTop: number;
  scrollLeft: number;
  stats: DocumentStats;
}

interface EditorInputSnapshotOptions {
  includeStats?: boolean;
}

export function getTextareaSelection(source: TextareaSnapshotSource): TextSelection {
  const direction = source.selectionDirection;

  return {
    start: Math.max(0, Math.floor(Number(source.selectionStart) || 0)),
    end: Math.max(0, Math.floor(Number(source.selectionEnd) || 0)),
    direction: direction === 'forward' || direction === 'backward' ? direction : 'none'
  };
}

export function createEditorInputSnapshot(
  source: TextareaSnapshotSource,
  options: EditorInputSnapshotOptions = {}
): EditorInputSnapshot {
  const snapshot: EditorInputSnapshot = {
    value: source.value,
    selection: getTextareaSelection(source),
    scrollTop: Math.max(0, Number(source.scrollTop) || 0),
    scrollLeft: Math.max(0, Number(source.scrollLeft) || 0)
  };

  if (options.includeStats) {
    snapshot.stats = getDocumentStats(source.value);
  }

  return snapshot;
}

function selectionMatches(left: TextSelection, right: TextSelection): boolean {
  return (
    left.start === right.start &&
    left.end === right.end &&
    left.direction === right.direction
  );
}

function statsMatches(left: DocumentStats, right: DocumentStats): boolean {
  return (
    left.charCount === right.charCount &&
    left.wordCount === right.wordCount &&
    left.readingTimeMinutes === right.readingTimeMinutes
  );
}

export function mergeEditorInputSnapshot<TState extends EditorInputMergeState>(
  state: TState,
  snapshot: EditorInputSnapshot
): TState {
  const nextStats = snapshot.stats || state.stats;
  const unchanged = (
    state.value === snapshot.value &&
    selectionMatches(state.selection, snapshot.selection) &&
    state.scrollTop === snapshot.scrollTop &&
    state.scrollLeft === snapshot.scrollLeft &&
    statsMatches(state.stats, nextStats)
  );

  if (unchanged) return state;

  return {
    ...state,
    value: snapshot.value,
    selection: snapshot.selection,
    scrollTop: snapshot.scrollTop,
    scrollLeft: snapshot.scrollLeft,
    stats: nextStats
  };
}
